import { Controller, Route, Get, Query, Response, Tags } from '@tsoa/runtime';
import * as fileSystemService from '../services/fileSystem.js';
import type { BrowseResponse } from '../types/fileSystem.js';
import type { ErrorResponse } from '../types/projects.js';

@Route('api/fs')
@Tags('File System')
export class FilesController extends Controller {
  /**
   * Browse subdirectories of a local path.
   * Defaults to the home directory when no path is provided.
   */
  @Get('/browse')
  @Response<ErrorResponse>(400, 'Path is not a directory')
  @Response<ErrorResponse>(403, 'Access to this path is not allowed')
  @Response<ErrorResponse>(404, 'Directory not found')
  public browse(@Query() path?: string): BrowseResponse {
    return fileSystemService.browse(path);
  }
}
