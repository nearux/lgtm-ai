import { spawn, type ChildProcess } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { randomUUID } from 'node:crypto';
import { LineBuffer } from './lineBuffer.js';
import { parseStreamJsonLine } from './streamJsonParser.js';
import { ClaudeArgsBuilder } from './ClaudeArgsBuilder.js';
import type {
  ClaudeExecuteOptions,
  ClaudeExecutionMode,
} from '../../types/claude.js';

export interface ClaudeStreamEvents {
  text: [chunk: string];
  stderr: [chunk: string];
  done: [exitCode: number];
  error: [message: string];
  tool_message: [toolId: string, toolName: string, input: unknown];
  tool_result: [toolId: string, content: string, isError: boolean];
  approval_request: [
    approvalRequestId: string,
    toolUseId: string,
    toolName: string,
    input: unknown,
  ];
  plan_approval_request: [
    approvalRequestId: string,
    toolUseId: string,
    toolName: string,
    input: unknown,
  ];
}

/**
 * Represents an active Claude Code CLI session.
 *
 * Extends EventEmitter with strongly-typed events and explicit lifecycle
 * management via `abort()`.
 *
 * Emitted events:
 *  - `data`          – extracted text from an assistant message
 *  - `tool_message` – a tool call has completed with input (toolId, toolName, input)
 *  - `tool_result`   – tool execution result received (toolId, content, isError)
 *  - `done`          – process exited cleanly (payload: exit code)
 *  - `error`         – spawn failure or non-zero exit (payload: message)
 */
export class ClaudeProcess extends EventEmitter<ClaudeStreamEvents> {
  private readonly childProcess: ChildProcess | null = null;
  private readonly lineBuffer = new LineBuffer();

  constructor(workingDir: string, options: ClaudeExecuteOptions = {}) {
    super();

    const args = new ClaudeArgsBuilder().withOptions(options).build();

    let child: ChildProcess;
    try {
      child = spawn('claude', args, {
        cwd: workingDir,
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      // Emit asynchronously so callers can attach listeners first
      process.nextTick(() =>
        this.emit('error', `Failed to spawn claude: ${message}`)
      );
      return;
    }

    this.childProcess = child;

    child.stdout!.on('data', (chunk: Buffer) => this.handleChunk(chunk));
    child.stderr!.on('data', (chunk: Buffer) =>
      this.emit('stderr', chunk.toString())
    );
    child.on('error', (err) =>
      this.emit('error', `Process error: ${err.message}`)
    );
    child.on('close', (code) => this.handleClose(code));
  }

  sendInitialize(requestId: string, mode?: string): void {
    let preToolUseHooks: { matcher: string; hookCallbackIds: string[] }[];
    switch (mode) {
      case 'plan':
        preToolUseHooks = [
          {
            matcher: '^ExitPlanMode$',
            hookCallbackIds: ['tool_approval'],
          },
          {
            matcher: '^(?!ExitPlanMode$).*',
            hookCallbackIds: ['auto_approve'],
          },
        ];
        break;
      case 'acceptEdits':
        preToolUseHooks = [
          {
            matcher: '^Bash$',
            hookCallbackIds: ['tool_approval'],
          },
        ];
        break;
      case 'bypassPermissions':
        preToolUseHooks = [];
        break;
      case 'default':
      default:
        preToolUseHooks = [
          {
            matcher: '^(?!(Glob|Grep|Read|Task|TodoWrite)$).*',
            hookCallbackIds: ['tool_approval'],
          },
        ];
        break;
    }

    this.writeJson({
      type: 'control_request',
      request_id: requestId,
      request: {
        subtype: 'initialize',
        hooks: {
          PreToolUse: preToolUseHooks,
        },
      },
    });
  }

  sendPermissionMode(mode: ClaudeExecutionMode): void {
    this.writeJson({
      type: 'control_request',
      request_id: randomUUID(),
      request: { subtype: 'set_permission_mode', mode },
    });
  }

  sendPrompt(prompt: string): void {
    this.writeJson({
      type: 'user',
      message: { role: 'user', content: prompt },
    });
  }

  sendApprovalResponse(
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string,
    updatedInput?: unknown,
    isExitPlanMode = false
  ): void {
    const hookOutput =
      behavior === 'allow'
        ? {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'allow',
              permissionDecisionReason: 'Approved by user',
              ...(updatedInput !== undefined && { updatedInput }),
              ...(isExitPlanMode && {
                updatedPermissions: [
                  {
                    type: 'setMode',
                    mode: 'bypassPermissions',
                    destination: 'session',
                  },
                ],
              }),
            },
          }
        : {
            hookSpecificOutput: {
              hookEventName: 'PreToolUse',
              permissionDecision: 'deny',
              permissionDecisionReason: message ?? 'Denied by user',
            },
          };

    this.writeJson({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: approvalRequestId,
        response: hookOutput,
      },
    });
  }

  sendPlanApprovalResponse(
    approvalRequestId: string,
    behavior: 'allow' | 'deny',
    message?: string,
    updatedInput?: unknown
  ): void {
    const response =
      behavior === 'allow'
        ? {
            behavior: 'allow',
            updatedInput: updatedInput ?? {},
          }
        : {
            behavior: 'deny',
            message: message ?? 'Denied by user',
            interrupt: false,
          };

    this.writeJson({
      type: 'control_response',
      response: {
        subtype: 'success',
        request_id: approvalRequestId,
        response,
      },
    });
  }

  private writeJson(value: unknown): void {
    this.childProcess?.stdin!.write(JSON.stringify(value) + '\n');
  }

  abort(): void {
    this.childProcess?.kill();
  }

  private handleChunk(chunk: Buffer): void {
    for (const line of this.lineBuffer.push(chunk.toString())) {
      this.emitParsedLine(line);
    }
  }

  private handleClose(code: number | null): void {
    const remaining = this.lineBuffer.flush();
    if (remaining.trim()) {
      this.emitParsedLine(remaining);
    }

    if (code === 0 || code === null) {
      this.emit('done', code ?? 0);
    } else {
      this.emit('error', `Process exited with code ${code}`);
    }
  }

  private emitParsedLine(line: string): void {
    const result = parseStreamJsonLine(line);
    if (!result) return;

    switch (result.kind) {
      case 'text':
        this.emit('text', result.text);
        break;
      case 'tool_complete':
        this.emit('tool_message', result.toolId, result.toolName, result.input);
        break;
      case 'tool_result':
        this.emit('tool_result', result.toolId, result.content, result.isError);
        break;
      case 'hook_callback':
        console.log(
          `[process] hook_callback: callbackId=${result.callbackId} toolName=${result.toolName}`
        );
        if (result.callbackId === 'auto_approve') {
          this.writeJson({
            type: 'control_response',
            response: {
              subtype: 'success',
              request_id: result.requestId,
              response: {
                hookSpecificOutput: {
                  hookEventName: 'PreToolUse',
                  permissionDecision: 'allow',
                  permissionDecisionReason: 'Auto-approved',
                },
              },
            },
          });
        } else if (result.callbackId === 'tool_approval') {
          this.emit(
            'approval_request',
            result.requestId,
            result.toolUseId,
            result.toolName,
            result.input
          );
        } else {
          console.warn(`Unknown callbackId: ${result.callbackId}`);
        }
        break;
      case 'can_use_tool':
        console.log(
          `[process] can_use_tool: toolName=${result.toolName} toolUseId=${result.toolUseId}`
        );
        this.emit(
          'plan_approval_request',
          result.requestId,
          result.toolUseId,
          result.toolName,
          result.input
        );
        break;
    }
  }
}
