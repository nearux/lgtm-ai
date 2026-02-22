import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Dirent, Stats } from 'node:fs';
import { AppError } from '../errors/AppError.js';

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  statSync: vi.fn(),
  readdirSync: vi.fn(),
}));

vi.mock('node:os', () => ({
  default: { homedir: () => '/home/user' },
}));

import * as fs from 'node:fs';
import { browse } from './fileSystem.js';

function makeStats({ isDirectory }: { isDirectory: boolean }): Stats {
  return { isDirectory: () => isDirectory } as unknown as Stats;
}

function makeDirent({
  name,
  isDir,
}: {
  name: string;
  isDir: boolean;
}): Dirent<Buffer> {
  return {
    name,
    isDirectory: () => isDir,
    isSymbolicLink: () => false,
    isFile: () => !isDir,
    isBlockDevice: () => false,
    isCharacterDevice: () => false,
    isFIFO: () => false,
    isSocket: () => false,
    path: Buffer.from(''),
    parentPath: Buffer.from(''),
  } as unknown as Dirent<Buffer>;
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe('fileSystemService.browse', () => {
  it('should default to home directory when no path is given', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue(makeStats({ isDirectory: true }));
    vi.mocked(fs.readdirSync).mockReturnValue([]);

    const result = browse();

    expect(result.path).toBe('/home/user');
  });

  it('should throw 404 when path does not exist', () => {
    vi.mocked(fs.existsSync).mockReturnValue(false);

    expect(() => browse('/nonexistent')).toThrow(AppError);
    expect(() => browse('/nonexistent')).toThrowError('Directory not found');
  });

  it('should throw 400 when path is a file, not a directory', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue(makeStats({ isDirectory: false }));

    expect(() => browse('/some/file.txt')).toThrow(AppError);
    expect(() => browse('/some/file.txt')).toThrowError(
      'Path is not a directory'
    );
  });

  it('should throw 403 for a blocked path', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue(makeStats({ isDirectory: true }));

    expect(() => browse('/etc')).toThrow(AppError);
    expect(() => browse('/etc')).toThrowError(
      'Access to this path is not allowed'
    );
  });

  it('should throw 403 for a subdirectory of a blocked path', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue(makeStats({ isDirectory: true }));

    expect(() => browse('/etc/nginx')).toThrow(AppError);
    expect(() => browse('/etc/nginx')).toThrowError(
      'Access to this path is not allowed'
    );
  });

  it('should throw 500 when readdirSync fails', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue(makeStats({ isDirectory: true }));
    vi.mocked(fs.readdirSync).mockImplementation(() => {
      throw new Error('permission denied');
    });

    expect(() => browse('/home/user')).toThrow(AppError);
    expect(() => browse('/home/user')).toThrowError('Failed to read directory');
  });

  it('should return path, parent, and directory entries', () => {
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.statSync).mockReturnValue(makeStats({ isDirectory: true }));
    vi.mocked(fs.readdirSync).mockReturnValue([
      makeDirent({ name: 'projects', isDir: true }),
      makeDirent({ name: 'downloads', isDir: true }),
      makeDirent({ name: '.hidden', isDir: true }),
      makeDirent({ name: 'file.txt', isDir: false }),
    ] as ReturnType<typeof fs.readdirSync>);

    const result = browse('/home/user');

    expect(result).toEqual({
      path: '/home/user',
      parent: '/home',
      entries: [
        { name: 'downloads', path: '/home/user/downloads' },
        { name: 'projects', path: '/home/user/projects' },
      ],
    });
  });
});
