import type { ClaudeExecuteOptions } from './types.js';

export class ClaudeArgsBuilder {
  private readonly args: string[];

  constructor() {
    this.args = [
      '--verbose',
      '--input-format=stream-json',
      '--output-format=stream-json',
      '--include-partial-messages',
      '--replay-user-messages',
      '--disallowedTools=AskUserQuestion',
    ];
  }

  withOptions(options: ClaudeExecuteOptions): this {
    if (options.executionMode === 'bypassPermissions') {
      this.args.push('--dangerously-skip-permissions');
    } else if (options.executionMode === 'plan') {
      // enables hooks to return a JSON PermissionResult,
      // which is required to dynamically update permission mode at runtime
      this.args.push('--permission-prompt-tool=stdio');
      this.args.push('--permission-mode=bypassPermissions');
    } else if (options.executionMode === 'acceptEdits') {
      this.args.push(`--permission-mode=${options.executionMode}`);
    }

    if (options.model) {
      this.args.push(`--model=${options.model}`);
    }

    if (options.sessionId) {
      this.args.push(`--resume=${options.sessionId}`);
    }

    return this;
  }

  withSystemPrompt(prompt: string): this {
    this.args.push('--append-system-prompt', prompt);
    return this;
  }

  build(): string[] {
    return [...this.args];
  }
}
