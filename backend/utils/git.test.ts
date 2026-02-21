import { describe, it, expect } from 'vitest';
import { parseGitHubRepo } from './git.js';

describe('parseGitHubRepo', () => {
  describe('SSH format', () => {
    it('should parse SSH URL without .git', () => {
      const result = parseGitHubRepo('git@github.com:owner/repo');
      expect(result).toBe('owner/repo');
    });

    it('should parse SSH URL with .git', () => {
      const result = parseGitHubRepo('git@github.com:owner/repo.git');
      expect(result).toBe('owner/repo');
    });
  });

  describe('HTTPS format', () => {
    it('should parse HTTPS URL without .git', () => {
      const result = parseGitHubRepo('https://github.com/owner/repo');
      expect(result).toBe('owner/repo');
    });

    it('should parse HTTPS URL with .git', () => {
      const result = parseGitHubRepo('https://github.com/owner/repo.git');
      expect(result).toBe('owner/repo');
    });
  });

  describe('Short format', () => {
    it('should parse short URL with colon', () => {
      const result = parseGitHubRepo('github.com:owner/repo');
      expect(result).toBe('owner/repo');
    });

    it('should parse short URL with slash', () => {
      const result = parseGitHubRepo('github.com/owner/repo');
      expect(result).toBe('owner/repo');
    });
  });

  describe('Error cases', () => {
    it('should throw error for invalid URL', () => {
      expect(() => parseGitHubRepo('invalid-url')).toThrow(
        'Unable to parse GitHub repository from remote URL: invalid-url'
      );
    });

    it('should throw error for non-GitHub URL', () => {
      expect(() =>
        parseGitHubRepo('https://gitlab.com/owner/repo.git')
      ).toThrow('Unable to parse GitHub repository from remote URL');
    });

    it('should throw error for empty string', () => {
      expect(() => parseGitHubRepo('')).toThrow(
        'Unable to parse GitHub repository from remote URL: '
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle URL with username in HTTPS', () => {
      const result = parseGitHubRepo('https://user@github.com/owner/repo.git');
      expect(result).toBe('owner/repo');
    });

    it('should handle repo names with dashes and underscores', () => {
      const result = parseGitHubRepo('git@github.com:my-org/my_repo-v2.git');
      expect(result).toBe('my-org/my_repo-v2');
    });

    it('should handle repo names with dots', () => {
      const result = parseGitHubRepo('https://github.com/owner/repo.name.git');
      expect(result).toBe('owner/repo.name');
    });
  });
});
