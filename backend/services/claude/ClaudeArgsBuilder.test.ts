import { describe, it, expect } from 'vitest';
import { ClaudeArgsBuilder } from './ClaudeArgsBuilder.js';

describe('ClaudeArgsBuilder', () => {
  describe('withSystemPrompt', () => {
    it('appends --append-system-prompt with the given prompt', () => {
      const args = new ClaudeArgsBuilder()
        .withSystemPrompt('You are a helper.')
        .build();

      const idx = args.indexOf('--append-system-prompt');
      expect(idx).toBeGreaterThanOrEqual(0);
      expect(args[idx + 1]).toBe('You are a helper.');
    });

    it('is chainable with withOptions', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({ executionMode: 'bypassPermissions' })
        .withSystemPrompt('ctx')
        .build();

      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--append-system-prompt');
    });
  });
});
