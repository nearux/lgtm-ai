import { statSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import HttpStatus from 'http-status';
import { injectable } from 'inversify';
import { AppError } from '../../errors/AppError.js';
import { DirectoryParser } from './directory-parser.js';
import type { BrowseResponse } from '../../types/fileSystem.js';

const BLOCKED_PATHS = [
  '/etc',
  '/bin',
  '/sbin',
  '/dev',
  '/sys',
  '/proc',
  '/root',
  '/boot',
];

@injectable()
export class FileSystemService {
  browse(rawPath?: string): BrowseResponse {
    const targetPath = path.resolve(rawPath ?? os.homedir());

    if (!existsSync(targetPath)) {
      throw new AppError('Directory not found', HttpStatus.NOT_FOUND);
    }

    const stat = statSync(targetPath);
    if (!stat.isDirectory()) {
      throw new AppError('Path is not a directory', HttpStatus.BAD_REQUEST);
    }

    if (this.isBlocked(targetPath)) {
      throw new AppError(
        'Access to this path is not allowed',
        HttpStatus.FORBIDDEN
      );
    }

    let dirents;
    try {
      dirents = readdirSync(targetPath, { withFileTypes: true });
    } catch {
      throw new AppError(
        'Failed to read directory',
        HttpStatus.INTERNAL_SERVER_ERROR
      );
    }

    return new DirectoryParser(targetPath, dirents).parse();
  }

  private isBlocked(absPath: string): boolean {
    return BLOCKED_PATHS.some(
      (blocked) =>
        absPath === blocked || absPath.startsWith(path.join(blocked, path.sep))
    );
  }
}
