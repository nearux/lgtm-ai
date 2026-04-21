import type { IocContainer } from '@tsoa/runtime';
import { container } from './container.js';

export const iocContainer: IocContainer = {
  get: <T>(controller: { prototype: T }): T =>
    container.get<T>(controller as never),
};
