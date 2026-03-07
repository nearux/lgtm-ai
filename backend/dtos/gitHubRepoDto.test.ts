import { describe, it, expect } from 'vitest';
import { GitHubRepoDto } from './gitHubRepoDto.js';

describe('GitHubRepoDto.fromRemoteUrl', () => {
  describe('SSH format', () => {
    it('should parse SSH URL', () => {
      const result = GitHubRepoDto.fromRemoteUrl(
        'git@github.com:owner/repo.git'
      );
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });
  });

  describe('HTTPS format', () => {
    it('should parse HTTPS URL', () => {
      const result = GitHubRepoDto.fromRemoteUrl(
        'https://github.com/owner/repo.git'
      );
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });
  });

  describe('Short format', () => {
    it('should parse short URL with colon', () => {
      const result = GitHubRepoDto.fromRemoteUrl('github.com:owner/repo');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should parse short URL with slash', () => {
      const result = GitHubRepoDto.fromRemoteUrl('github.com/owner/repo');
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });
  });

  describe('Error cases', () => {
    it('should throw error for invalid URL', () => {
      expect(() => GitHubRepoDto.fromRemoteUrl('invalid-url')).toThrow(
        'Unable to parse GitHub repository from remote URL: invalid-url'
      );
    });

    it('should throw error for non-GitHub URL', () => {
      expect(() =>
        GitHubRepoDto.fromRemoteUrl('https://gitlab.com/owner/repo.git')
      ).toThrow('Unable to parse GitHub repository from remote URL');
    });

    it('should throw error for empty string', () => {
      expect(() => GitHubRepoDto.fromRemoteUrl('')).toThrow(
        'Unable to parse GitHub repository from remote URL: '
      );
    });
  });

  describe('Edge cases', () => {
    it('should handle URL with username in HTTPS', () => {
      const result = GitHubRepoDto.fromRemoteUrl(
        'https://user@github.com/owner/repo.git'
      );
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo');
    });

    it('should handle repo names with dashes and underscores', () => {
      const result = GitHubRepoDto.fromRemoteUrl(
        'git@github.com:my-org/my_repo-v2.git'
      );
      expect(result.owner).toBe('my-org');
      expect(result.repo).toBe('my_repo-v2');
    });

    it('should handle repo names with dots', () => {
      const result = GitHubRepoDto.fromRemoteUrl(
        'https://github.com/owner/repo.name.git'
      );
      expect(result.owner).toBe('owner');
      expect(result.repo).toBe('repo.name');
    });
  });
});
