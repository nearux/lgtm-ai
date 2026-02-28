import type { ClaudeExecuteOptions } from '../../types/claude.js';

export class ClaudeArgsBuilder {
  private readonly args: string[];

  constructor(prompt: string) {
    this.args = [
      '-p',
      prompt,
      '--output-format=stream-json',
      '--verbose',
      '--include-partial-messages',
    ];
  }

  withOptions(options: ClaudeExecuteOptions): this {
    if (options.dangerouslySkipPermissions) {
      this.args.push('--dangerously-skip-permissions');
    }

    if (options.permissionMode && options.permissionMode !== 'default') {
      this.args.push(`--permission-mode=${options.permissionMode}`);
    }

    if (options.model) {
      this.args.push(`--model=${options.model}`);
    }

    return this;
  }

  build(): string[] {
    return [...this.args];
  }
}
