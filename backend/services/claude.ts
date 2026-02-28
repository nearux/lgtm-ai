import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export interface ClaudeStreamEvents {
  data: [chunk: string];
  done: [exitCode: number];
  error: [message: string];
}

export interface ClaudeStreamEmitter extends EventEmitter {
  on<K extends keyof ClaudeStreamEvents>(
    event: K,
    listener: (...args: ClaudeStreamEvents[K]) => void
  ): this;
  emit<K extends keyof ClaudeStreamEvents>(
    event: K,
    ...args: ClaudeStreamEvents[K]
  ): boolean;
  /** Kills the underlying child process */
  abort(): void;
}

/**
 * Spawns the Claude Code CLI and returns a typed EventEmitter.
 *
 * Emitted events:
 *  - `data`  – a chunk of stdout/stderr output
 *  - `done`  – process exited successfully (payload: exit code)
 *  - `error` – spawn failure or non-zero exit (payload: message)
 */
export function executeClaudeStream(
  prompt: string,
  workingDir: string
): ClaudeStreamEmitter {
  const emitter = new EventEmitter() as ClaudeStreamEmitter;

  let claudeProcess;
  try {
    claudeProcess = spawn('claude', ['-p', prompt], {
      cwd: workingDir,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    // emit asynchronously so callers can attach listeners first
    process.nextTick(() =>
      emitter.emit('error', `Failed to spawn claude: ${message}`)
    );
    emitter.abort = () => {};
    return emitter;
  }

  emitter.abort = () => claudeProcess.kill();

  claudeProcess.stdout.on('data', (chunk: Buffer) => {
    emitter.emit('data', chunk.toString());
  });

  claudeProcess.stderr.on('data', (chunk: Buffer) => {
    emitter.emit('data', chunk.toString());
  });

  claudeProcess.on('error', (err) => {
    emitter.emit('error', `Process error: ${err.message}`);
  });

  claudeProcess.on('close', (code) => {
    if (code === 0 || code === null) {
      emitter.emit('done', code ?? 0);
    } else {
      emitter.emit('error', `Process exited with code ${code}`);
    }
  });

  return emitter;
}
