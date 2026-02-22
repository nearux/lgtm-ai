import path from 'node:path';
import type { Dirent } from 'node:fs';
import type { DirectoryEntry, BrowseResponse } from '../types/fileSystem.js';

export class DirectoryParser {
  constructor(
    private readonly targetPath: string,
    private readonly dirents: Dirent[]
  ) {}

  /**
   * Filters out files and hidden directories (names starting with "."),
   * maps each remaining entry to a {@link DirectoryEntry} with its absolute path,
   * and sorts the result alphabetically by name.
   */
  private parseEntries(): DirectoryEntry[] {
    return this.dirents
      .filter(
        (entry) =>
          entry.isDirectory() &&
          !entry.isSymbolicLink() &&
          !entry.name.startsWith('.')
      )
      .map((entry) => ({
        name: entry.name,
        path: path.join(this.targetPath, entry.name),
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Returns the absolute path of the parent directory,
   * or `null` if {@link targetPath} is the filesystem root.
   */
  private resolveParent(): string | null {
    const root = path.parse(this.targetPath).root;
    return this.targetPath !== root ? path.dirname(this.targetPath) : null;
  }

  parse(): BrowseResponse {
    return {
      path: this.targetPath,
      parent: this.resolveParent(),
      entries: this.parseEntries(),
    };
  }
}
