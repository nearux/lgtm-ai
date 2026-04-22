import { describe, it, expect } from 'vitest';
import { GitHubRepoDto } from './github-repo.dto.js';

describe('GitHubRepoDto.fromRemoteUrl', () => {
  describe('SSH format', () => {
    it('should parse SSH URL', () => {
      expect(
        GitHubRepoDto.fromRemoteUrl('git@github.com:owner/repo.git')
      ).toMatchObject({ owner: 'owner', repo: 'repo' });
    });
  });

  describe('HTTPS format', () => {
    it('should parse HTTPS URL', () => {
      expect(
        GitHubRepoDto.fromRemoteUrl('https://github.com/owner/repo.git')
      ).toMatchObject({ owner: 'owner', repo: 'repo' });
    });
  });

  describe('Short format', () => {
    it('should parse short URL with colon', () => {
      expect(
        GitHubRepoDto.fromRemoteUrl('github.com:owner/repo')
      ).toMatchObject({ owner: 'owner', repo: 'repo' });
    });

    it('should parse short URL with slash', () => {
      expect(
        GitHubRepoDto.fromRemoteUrl('github.com/owner/repo')
      ).toMatchObject({ owner: 'owner', repo: 'repo' });
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
      expect(
        GitHubRepoDto.fromRemoteUrl('https://user@github.com/owner/repo.git')
      ).toMatchObject({ owner: 'owner', repo: 'repo' });
    });

    it('should handle repo names with dashes and underscores', () => {
      expect(
        GitHubRepoDto.fromRemoteUrl('git@github.com:my-org/my_repo-v2.git')
      ).toMatchObject({ owner: 'my-org', repo: 'my_repo-v2' });
    });

    it('should handle repo names with dots', () => {
      expect(
        GitHubRepoDto.fromRemoteUrl('https://github.com/owner/repo.name.git')
      ).toMatchObject({ owner: 'owner', repo: 'repo.name' });
    });
  });
});
