import { describe, it, expect } from 'vitest';
import { ClaudeArgsBuilder } from './ClaudeArgsBuilder.js';

describe('ClaudeArgsBuilder', () => {
  it('includes default flags on build', () => {
    const args = new ClaudeArgsBuilder().build();
    expect(args).toContain('--verbose');
    expect(args).toContain('--input-format=stream-json');
    expect(args).toContain('--output-format=stream-json');
    expect(args).toContain('--disallowedTools=AskUserQuestion');
  });

  describe('withOptions', () => {
    it('adds --dangerously-skip-permissions for bypassPermissions mode', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({ executionMode: 'bypassPermissions' })
        .build();
      expect(args).toContain('--dangerously-skip-permissions');
    });

    it('adds permission-prompt-tool and permission-mode for plan mode', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({ executionMode: 'plan' })
        .build();
      expect(args).toContain('--permission-prompt-tool=stdio');
      expect(args).toContain('--permission-mode=bypassPermissions');
    });

    it('adds --permission-mode for acceptEdits mode', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({ executionMode: 'acceptEdits' })
        .build();
      expect(args).toContain('--permission-mode=acceptEdits');
    });

    it('adds no permission flags for default mode', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({ executionMode: 'default' })
        .build();
      expect(args).not.toContain('--dangerously-skip-permissions');
      expect(args.some((a) => a.startsWith('--permission-mode'))).toBe(false);
    });

    it('adds --model when model is provided', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({ model: 'claude-sonnet-4-5-20250514' })
        .build();
      expect(args).toContain('--model=claude-sonnet-4-5-20250514');
    });

    it('adds --resume when sessionId is provided', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({ sessionId: 'sess-123' })
        .build();
      expect(args).toContain('--resume=sess-123');
    });

    it('combines multiple options', () => {
      const args = new ClaudeArgsBuilder()
        .withOptions({
          executionMode: 'bypassPermissions',
          model: 'opus',
          sessionId: 's1',
        })
        .build();
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--model=opus');
      expect(args).toContain('--resume=s1');
    });
  });

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
