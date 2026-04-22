import { ContainerModule } from 'inversify';
import { AuthService } from './auth.service.js';
import { AuthController } from './auth.controller.js';

export const authModule = new ContainerModule((options) => {
  options.bind(AuthService).toSelf();
  options.bind(AuthController).toSelf();
});
