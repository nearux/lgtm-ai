import type { ClaudeExecuteOptions } from '../../types/claude.js';

export class ClaudeArgsBuilder {
  private readonly args: string[];

  constructor() {
    this.args = [
      '--verbose',
      '--input-format=stream-json',
      '--output-format=stream-json',
      '--include-partial-messages',
    ];
  }

  withOptions(options: ClaudeExecuteOptions): this {
    if (options.dangerouslySkipPermissions) {
      this.args.push('--dangerously-skip-permissions');
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
