import type { IocContainer, Newable } from '@tsoa/runtime';
import { container } from './container.js';

export const iocContainer: IocContainer = {
  get: <T>(controller: Newable<T>): T => container.get<T>(controller),
};
