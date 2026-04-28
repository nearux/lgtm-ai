import { filter, map, pipe, sortBy, uniqueBy } from 'remeda';

import type { ProjectGitRemote } from '../types/project.types.js';

export class ProjectGitRemoteDto implements ProjectGitRemote {
  name: string;
  url: string;

  constructor(data: ProjectGitRemote) {
    this.name = data.name;
    this.url = data.url;
  }

  static fromGitRemoteList(raw: string): ProjectGitRemoteDto[] {
    return pipe(
      raw.split('\n'),
      map((line) => line.trim()),
      filter((line) => line.length > 0),
      map((line) => line.match(/^(\S+)\s+(\S+)\s+\((fetch|push)\)$/)),
      filter((match): match is RegExpMatchArray => match !== null),
      map((match) => ({
        name: match[1],
        url: match[2],
        type: match[3] as 'fetch' | 'push',
      })),
      sortBy((r) => (r.type === 'fetch' ? 0 : 1)),
      uniqueBy((r) => r.name),
      map(({ name, url }) => new ProjectGitRemoteDto({ name, url }))
    );
  }
}
