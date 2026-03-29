import { describe, it, expect } from 'vitest';
import { buildPrompt } from './promptBuilder.js';
import type { CommandContext } from '../types/claude.js';

const reviewContext: CommandContext = {
  type: 'review',
  author: 'alice',
  body: 'This variable name is unclear',
  prNumber: 42,
};

const commentContext: CommandContext = {
  type: 'comment',
  author: 'bob',
  body: 'Missing null check here',
  path: 'src/utils/helper.ts',
  prNumber: 42,
};

describe('buildPrompt', () => {
  it('validate - review: contains VALID/INVALID instruction', () => {
    const result = buildPrompt('validate', reviewContext);
    expect(result).toContain('PR review comment');
    expect(result).toContain('alice');
    expect(result).toContain('This variable name is unclear');
    expect(result).toContain('VALID');
    expect(result).toContain('INVALID');
  });

  it('validate - comment: uses inline comment phrasing and includes path', () => {
    const result = buildPrompt('validate', commentContext);
    expect(result).toContain('inline code comment');
    expect(result).toContain('src/utils/helper.ts');
  });

  it('explain - review: contains explain instruction', () => {
    const result = buildPrompt('explain', reviewContext);
    expect(result).toContain('Explain this code review comment');
    expect(result).toContain('alice');
  });

  it('fix - review: contains fix instruction', () => {
    const result = buildPrompt('fix', reviewContext);
    expect(result).toContain('Fix the code based on this review');
    expect(result).toContain('Do NOT use git commands');
  });

  it('custom: wraps customPrompt with context preamble', () => {
    const result = buildPrompt('custom', reviewContext, 'What is the impact?');
    expect(result).toContain('What is the impact?');
    expect(result).toContain('alice');
    expect(result).toContain('This variable name is unclear');
    expect(result).toContain('#42');
  });

  it('custom: throws if customPrompt is missing', () => {
    expect(() => buildPrompt('custom', reviewContext)).toThrow(
      'customPrompt is required'
    );
  });

  it('comment type: throws if path is missing', () => {
    const noPath: CommandContext = {
      type: 'comment',
      author: 'x',
      body: 'y',
      prNumber: 1,
    };
    expect(() => buildPrompt('validate', noPath)).toThrow('path is required');
  });
});
