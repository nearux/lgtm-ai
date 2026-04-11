import { describe, it, expect } from 'vitest';
import {
  buildSystemPrompt,
  buildUserPrompt,
  buildBatchUserPrompt,
} from './promptBuilder.js';
import type { CommandContext, PRMeta, ClaudeCommand } from '../types/claude.js';

const prMeta: PRMeta = {
  number: 42,
  title: 'Add user authentication',
  body: 'Implements JWT-based auth with refresh tokens.',
  baseBranch: 'main',
  headBranch: 'feature/auth',
  repoOwnerName: 'acme/app',
};

const reviewContext: CommandContext = {
  type: 'review',
  author: 'alice',
  body: 'This variable name is unclear',
  prMeta,
};

const commentContext: CommandContext = {
  type: 'comment',
  author: 'bob',
  body: 'Missing null check here',
  path: 'src/utils/helper.ts',
  diffHunk:
    '@@ -10,6 +10,8 @@\n function helper() {\n+  const x = getValue();\n+  x.doSomething();',
  prMeta,
};

const prContext: CommandContext = {
  type: 'pr',
  prMeta,
};

describe('buildSystemPrompt', () => {
  it('includes PR title, branch info, and description', () => {
    const result = buildSystemPrompt(reviewContext);
    expect(result).toContain('acme/app');
    expect(result).toContain('#42');
    expect(result).toContain('Add user authentication');
    expect(result).toContain('feature/auth');
    expect(result).toContain('main');
    expect(result).toContain('JWT-based auth');
  });

  it('includes guideline about using gh CLI', () => {
    const result = buildSystemPrompt(reviewContext);
    expect(result).toContain('`gh` CLI');
  });

  it('shows "(no description)" when prMeta.body is empty', () => {
    const ctx: CommandContext = {
      ...reviewContext,
      prMeta: { ...prMeta, body: '' },
    };
    const result = buildSystemPrompt(ctx);
    expect(result).toContain('(no description)');
  });

  it('uses PR-specific system prompt for pr context', () => {
    const result = buildSystemPrompt(prContext);
    expect(result).toContain('overall changes introduced in this pull request');
  });
});

describe('buildUserPrompt', () => {
  describe('explain', () => {
    it('includes comment body and author', () => {
      const result = buildUserPrompt('explain', reviewContext);
      expect(result).toContain('alice');
      expect(result).toContain('This variable name is unclear');
    });

    it('includes diff hunk when present', () => {
      const result = buildUserPrompt('explain', commentContext);
      expect(result).toContain('diff');
      expect(result).toContain('x.doSomething()');
    });

    it('includes file path when present', () => {
      const result = buildUserPrompt('explain', commentContext);
      expect(result).toContain('src/utils/helper.ts');
    });

    it('omits diff section when no diffHunk', () => {
      const result = buildUserPrompt('explain', reviewContext);
      expect(result).not.toContain('Code Change');
    });
  });

  describe('fix', () => {
    it('includes instruction to not use git', () => {
      const result = buildUserPrompt('fix', commentContext);
      expect(result).toContain('Do NOT use git commands');
    });

    it('includes instruction to explain changes', () => {
      const result = buildUserPrompt('fix', commentContext);
      expect(result).toContain('explain what you changed');
    });
  });

  describe('validate', () => {
    it('includes VALID/INVALID instructions', () => {
      const result = buildUserPrompt('validate', reviewContext);
      expect(result).toContain('VALID');
      expect(result).toContain('INVALID');
    });
  });

  describe('custom', () => {
    it('includes custom prompt with context', () => {
      const result = buildUserPrompt(
        'custom',
        reviewContext,
        'What is the impact?'
      );
      expect(result).toContain('What is the impact?');
      expect(result).toContain('alice');
    });

    it('throws if customPrompt is missing', () => {
      expect(() => buildUserPrompt('custom', reviewContext)).toThrow(
        'customPrompt is required'
      );
    });

    it('throws if customPrompt is whitespace only', () => {
      expect(() => buildUserPrompt('custom', reviewContext, '   ')).toThrow(
        'customPrompt is required'
      );
    });
  });

  describe('PR-level commands', () => {
    describe('review', () => {
      it('includes gh pr diff instruction', () => {
        const result = buildUserPrompt('review', prContext);
        expect(result).toContain('gh pr diff 42 --repo acme/app');
      });

      it('includes review criteria', () => {
        const result = buildUserPrompt('review', prContext);
        expect(result).toContain('Correctness and potential bugs');
        expect(result).toContain('Security vulnerabilities');
      });
    });

    describe('explain', () => {
      it('includes gh pr diff instruction', () => {
        const result = buildUserPrompt('explain', prContext);
        expect(result).toContain('gh pr diff 42 --repo acme/app');
      });

      it('includes file-by-file walkthrough instruction', () => {
        const result = buildUserPrompt('explain', prContext);
        expect(result).toContain('file by file');
      });
    });

    describe('custom', () => {
      it('includes custom prompt with PR context', () => {
        const result = buildUserPrompt(
          'custom',
          prContext,
          'Check for security issues'
        );
        expect(result).toContain('Check for security issues');
        expect(result).toContain('gh pr diff 42 --repo acme/app');
      });

      it('throws if customPrompt is missing', () => {
        expect(() => buildUserPrompt('custom', prContext)).toThrow(
          'customPrompt is required'
        );
      });
    });

    it('throws on unsupported command for PR context', () => {
      expect(() => buildUserPrompt('fix', prContext)).toThrow(
        "Command 'fix' is not supported for PR-level context"
      );
    });

    it('throws on validate command for PR context', () => {
      expect(() => buildUserPrompt('validate', prContext)).toThrow(
        "Command 'validate' is not supported for PR-level context"
      );
    });
  });

  it('comment type with no path does not throw', () => {
    const noPath = {
      type: 'comment',
      author: 'x',
      body: 'y',
      prMeta,
    } as unknown as CommandContext;
    expect(() => buildUserPrompt('validate', noPath)).not.toThrow();
  });

  it('throws on unknown command', () => {
    expect(() =>
      buildUserPrompt('unknown' as ClaudeCommand, reviewContext)
    ).toThrow('Unknown command: unknown');
  });
});

const batchContexts = [
  {
    type: 'review' as const,
    author: 'alice',
    body: 'This variable name is unclear',
    prMeta,
  },
  {
    type: 'comment' as const,
    author: 'bob',
    body: 'Missing null check here',
    path: 'src/utils/helper.ts',
    diffHunk:
      '@@ -10,6 +10,8 @@\n function helper() {\n+  const x = getValue();\n+  x.doSomething();',
    prMeta,
  },
];

describe('buildBatchUserPrompt', () => {
  describe('fix', () => {
    it('includes all comment authors', () => {
      const result = buildBatchUserPrompt('fix', batchContexts);
      expect(result).toContain('alice');
      expect(result).toContain('bob');
    });

    it('numbers each comment', () => {
      const result = buildBatchUserPrompt('fix', batchContexts);
      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
    });

    it('includes instruction to not use git', () => {
      const result = buildBatchUserPrompt('fix', batchContexts);
      expect(result).toContain('Do NOT use git commands');
    });

    it('includes instruction to summarize per comment', () => {
      const result = buildBatchUserPrompt('fix', batchContexts);
      expect(result).toContain('per comment');
    });
  });

  describe('explain', () => {
    it('includes all comment bodies', () => {
      const result = buildBatchUserPrompt('explain', batchContexts);
      expect(result).toContain('This variable name is unclear');
      expect(result).toContain('Missing null check here');
    });
  });

  describe('validate', () => {
    it('includes VALID/INVALID instructions', () => {
      const result = buildBatchUserPrompt('validate', batchContexts);
      expect(result).toContain('VALID');
      expect(result).toContain('INVALID');
    });

    it('numbers each comment', () => {
      const result = buildBatchUserPrompt('validate', batchContexts);
      expect(result).toContain('[1]');
      expect(result).toContain('[2]');
    });
  });

  describe('custom', () => {
    it('includes custom prompt and all contexts', () => {
      const result = buildBatchUserPrompt(
        'custom',
        batchContexts,
        'Check security'
      );
      expect(result).toContain('Check security');
      expect(result).toContain('alice');
      expect(result).toContain('bob');
    });

    it('throws if customPrompt is missing', () => {
      expect(() => buildBatchUserPrompt('custom', batchContexts)).toThrow(
        'customPrompt is required'
      );
    });
  });

  it('throws on review command', () => {
    expect(() => buildBatchUserPrompt('review', batchContexts)).toThrow(
      "Command 'review' is not supported for batch"
    );
  });

  it('throws on unknown command', () => {
    expect(() =>
      buildBatchUserPrompt('unknown' as ClaudeCommand, batchContexts)
    ).toThrow();
  });

  it('includes diff hunk when present', () => {
    const result = buildBatchUserPrompt('explain', batchContexts);
    expect(result).toContain('x.doSomething()');
  });

  it('includes file path when present', () => {
    const result = buildBatchUserPrompt('explain', batchContexts);
    expect(result).toContain('src/utils/helper.ts');
  });
});
