// backend/modules/files/files.module.ts
import { ContainerModule } from 'inversify';
import { FileSystemService } from './file-system.service.js';
import { FilesController } from './files.controller.js';

export const filesModule = new ContainerModule((options) => {
  options.bind(FileSystemService).toSelf();
  options.bind(FilesController).toSelf();
});
