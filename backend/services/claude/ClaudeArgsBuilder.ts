import type { ClaudeExecuteOptions } from '../../types/claude.js';

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
    if (options.dangerouslySkipPermissions) {
      this.args.push('--dangerously-skip-permissions');
    } else if (
      options.permissionMode === 'plan' ||
      options.permissionMode === 'acceptEdits'
    ) {
      // enables hooks to return a JSON PermissionResult,
      // which is required to dynamically update permission mode at runtime
      this.args.push('--permission-prompt-tool=stdio');
      this.args.push('--permission-mode=bypassPermissions');
    } else if (options.permissionMode) {
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
