import { describe, it, expect } from 'vitest';
import type { Dirent } from 'node:fs';
import { DirectoryParser } from './directoryParser.js';

function makeDirent({
  name,
  isDir,
  isSymlink = false,
}: {
  name: string;
  isDir: boolean;
  isSymlink?: boolean;
}): Dirent {
  return {
    name,
    isDirectory: () => isDir,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    isSymbolicLink: () => isSymlink,
    path: '',
    parentPath: '',
  } as unknown as Dirent;
}

describe('DirectoryParser', () => {
  describe('parseEntries', () => {
    it('should include only directories', () => {
      const dirents = [
        makeDirent({ name: 'src', isDir: true }),
        makeDirent({ name: 'index.ts', isDir: false }),
        makeDirent({ name: 'README.md', isDir: false }),
      ];
      const result = new DirectoryParser('/base', dirents).parse();
      expect(result.entries).toEqual([{ name: 'src', path: '/base/src' }]);
    });

    it('should exclude symbolic links even if they appear as directories', () => {
      const dirents = [
        makeDirent({ name: 'real-dir', isDir: true }),
        makeDirent({ name: 'symlink-dir', isDir: true, isSymlink: true }),
      ];
      const result = new DirectoryParser('/base', dirents).parse();
      expect(result.entries).toEqual([
        { name: 'real-dir', path: '/base/real-dir' },
      ]);
    });

    it('should exclude hidden directories starting with "."', () => {
      const dirents = [
        makeDirent({ name: '.git', isDir: true }),
        makeDirent({ name: '.DS_Store', isDir: true }),
        makeDirent({ name: 'src', isDir: true }),
      ];
      const result = new DirectoryParser('/base', dirents).parse();
      expect(result.entries).toEqual([{ name: 'src', path: '/base/src' }]);
    });

    it('should sort entries alphabetically', () => {
      const dirents = [
        makeDirent({ name: 'zoo', isDir: true }),
        makeDirent({ name: 'alpha', isDir: true }),
        makeDirent({ name: 'middle', isDir: true }),
      ];
      const result = new DirectoryParser('/base', dirents).parse();
      expect(result.entries.map((e) => e.name)).toEqual([
        'alpha',
        'middle',
        'zoo',
      ]);
    });
  });

  describe('resolveParent', () => {
    it('should return parent directory path for a non-root path', () => {
      const result = new DirectoryParser('/Users/you/projects', []).parse();
      expect(result.parent).toBe('/Users/you');
    });

    it('should return null when targetPath is the filesystem root', () => {
      const result = new DirectoryParser('/', []).parse();
      expect(result.parent).toBeNull();
    });
  });

  describe('parse', () => {
    it('should return correct path, parent, and entries together', () => {
      const dirents = [
        makeDirent({ name: 'docs', isDir: true }),
        makeDirent({ name: 'src', isDir: true }),
      ];
      const result = new DirectoryParser('/Users/you', dirents).parse();
      expect(result).toEqual({
        path: '/Users/you',
        parent: '/Users',
        entries: [
          { name: 'docs', path: '/Users/you/docs' },
          { name: 'src', path: '/Users/you/src' },
        ],
      });
    });
  });
});
