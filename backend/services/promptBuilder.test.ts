import { describe, it, expect } from 'vitest';
import { buildSystemPrompt, buildUserPrompt } from './promptBuilder.js';
import type { CommandContext, PRMeta } from '../types/claude.js';

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
    expect(result).toContain('gh');
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

    it('includes diff hunk for inline comment', () => {
      const result = buildUserPrompt('fix', commentContext);
      expect(result).toContain('x.doSomething()');
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
  });

  it('comment type throws if path is missing', () => {
    const noPath: CommandContext = {
      type: 'comment',
      author: 'x',
      body: 'y',
      prMeta,
    };
    expect(() => buildUserPrompt('validate', noPath)).toThrow(
      'path is required'
    );
  });
});
