import { describe, it, expect } from 'vitest';
import { ProjectGitRemoteDto } from './project-git-info.dto.js';

describe('ProjectGitRemoteDto.fromGitRemoteList', () => {
  it('should parse standard git remote output', () => {
    const raw = [
      'origin\thttps://github.com/user/repo.git (fetch)',
      'origin\thttps://github.com/user/repo.git (push)',
      'upstream\tgit@github.com:org/repo.git (fetch)',
      'upstream\tgit@github.com:org/repo.git (push)',
    ].join('\n');

    const result = ProjectGitRemoteDto.fromGitRemoteList(raw);

    expect(result).toEqual([
      { name: 'origin', url: 'https://github.com/user/repo.git' },
      { name: 'upstream', url: 'git@github.com:org/repo.git' },
    ]);
  });

  it('should prefer fetch URL when deduplicating by name', () => {
    const raw = [
      'origin\thttps://fetch-url.git (fetch)',
      'origin\thttps://push-url.git (push)',
    ].join('\n');

    const result = ProjectGitRemoteDto.fromGitRemoteList(raw);

    expect(result).toHaveLength(1);
    expect(result[0].url).toBe('https://fetch-url.git');
  });

  it('should return empty array for empty input', () => {
    expect(ProjectGitRemoteDto.fromGitRemoteList('')).toEqual([]);
  });

  it('should skip malformed lines', () => {
    const raw = [
      'origin\thttps://github.com/user/repo.git (fetch)',
      'not a valid line',
      '',
      'upstream\tgit@github.com:org/repo.git (fetch)',
    ].join('\n');

    const result = ProjectGitRemoteDto.fromGitRemoteList(raw);

    expect(result).toHaveLength(2);
    expect(result.map((r) => r.name)).toEqual(['origin', 'upstream']);
  });
});
