import { Controller, Route, Get, Query, Response, Tags } from '@tsoa/runtime';
import { inject, injectable } from 'inversify';
import { FileSystemService } from './file-system.service.js';
import type { BrowseResponse } from './types.js';
import type { ErrorResponse } from '../../types/common.js';

@injectable()
@Route('api/fs')
@Tags('File System')
export class FilesController extends Controller {
  constructor(
    @inject(FileSystemService)
    private readonly fileSystemService: FileSystemService
  ) {
    super();
  }

  /**
   * Browse subdirectories of a local path.
   * Defaults to the home directory when no path is provided.
   */
  @Get('/browse')
  @Response<ErrorResponse>(400, 'Path is not a directory')
  @Response<ErrorResponse>(403, 'Access to this path is not allowed')
  @Response<ErrorResponse>(404, 'Directory not found')
  public browse(@Query() path?: string): BrowseResponse {
    return this.fileSystemService.browse(path);
  }
}
