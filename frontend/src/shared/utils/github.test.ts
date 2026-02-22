import { describe, it, expect } from 'vitest';
import { parseGitHubUrl, linkifyIssueReferences } from './github';

describe('parseGitHubUrl', () => {
  it('returns null for null input', () => {
    expect(parseGitHubUrl(null)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(parseGitHubUrl('')).toBeNull();
  });

  it('parses HTTPS URL with .git suffix', () => {
    const url = 'https://github.com/owner/repo.git';
    expect(parseGitHubUrl(url)).toBe('https://github.com/owner/repo');
  });

  it('parses HTTPS URL without .git suffix', () => {
    const url = 'https://github.com/owner/repo';
    expect(parseGitHubUrl(url)).toBe('https://github.com/owner/repo');
  });

  it('parses SSH URL with .git suffix', () => {
    const url = 'git@github.com:owner/repo.git';
    expect(parseGitHubUrl(url)).toBe('https://github.com/owner/repo');
  });

  it('parses SSH URL without .git suffix', () => {
    const url = 'git@github.com:owner/repo';
    expect(parseGitHubUrl(url)).toBe('https://github.com/owner/repo');
  });

  it('handles owner and repo with hyphens', () => {
    const url = 'https://github.com/my-org/my-awesome-repo.git';
    expect(parseGitHubUrl(url)).toBe(
      'https://github.com/my-org/my-awesome-repo'
    );
  });

  it('handles owner and repo with underscores', () => {
    const url = 'git@github.com:my_org/my_repo.git';
    expect(parseGitHubUrl(url)).toBe('https://github.com/my_org/my_repo');
  });

  it('returns null for non-GitHub URLs', () => {
    expect(parseGitHubUrl('https://gitlab.com/owner/repo')).toBeNull();
    expect(parseGitHubUrl('https://bitbucket.org/owner/repo')).toBeNull();
  });

  it('returns null for malformed URLs', () => {
    expect(parseGitHubUrl('not-a-url')).toBeNull();
    expect(parseGitHubUrl('github.com/owner/repo')).toBeNull();
  });
});

describe('linkifyIssueReferences', () => {
  const baseUrl = 'https://github.com/owner/repo';

  it('returns original text when baseUrl is null', () => {
    const text = 'Fixes #123';
    expect(linkifyIssueReferences(text, null)).toBe('Fixes #123');
  });

  it('converts single issue reference to link', () => {
    const text = 'Fixes #123';
    const result = linkifyIssueReferences(text, baseUrl);
    expect(result).toBe(
      'Fixes [#123](https://github.com/owner/repo/issues/123)'
    );
  });

  it('converts multiple issue references', () => {
    const text = 'Fixes #123 and #456';
    const result = linkifyIssueReferences(text, baseUrl);
    expect(result).toBe(
      'Fixes [#123](https://github.com/owner/repo/issues/123) and [#456](https://github.com/owner/repo/issues/456)'
    );
  });

  it('handles issue reference at start of text', () => {
    const text = '#42 is the answer';
    const result = linkifyIssueReferences(text, baseUrl);
    expect(result).toBe(
      '[#42](https://github.com/owner/repo/issues/42) is the answer'
    );
  });

  it('handles issue reference at end of text', () => {
    const text = 'Related to #99';
    const result = linkifyIssueReferences(text, baseUrl);
    expect(result).toBe(
      'Related to [#99](https://github.com/owner/repo/issues/99)'
    );
  });

  it('does not convert already linked references', () => {
    const text = 'See [#123](https://example.com)';
    const result = linkifyIssueReferences(text, baseUrl);
    expect(result).toBe('See [#123](https://example.com)');
  });

  it('handles text without issue references', () => {
    const text = 'No issues here';
    const result = linkifyIssueReferences(text, baseUrl);
    expect(result).toBe('No issues here');
  });

  it('handles issue reference in parentheses', () => {
    const text = 'Fixed (see #123)';
    const result = linkifyIssueReferences(text, baseUrl);
    expect(result).toBe(
      'Fixed (see [#123](https://github.com/owner/repo/issues/123))'
    );
  });
});
