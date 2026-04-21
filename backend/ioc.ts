import type { IocContainer, Newable } from '@tsoa/runtime';
import { container } from './container.js';

export const iocContainer: IocContainer = {
  get: <T>(controller: Newable<T>): T => {
    if (container.isBound(controller)) {
      return container.get<T>(controller);
    }
    // Fallback for controllers not yet migrated to the Inversify DI module.
    // Remove once all controllers are migrated.
    if (controller.length > 0) {
      throw new Error(
        `[ioc] ${controller.name} has constructor parameters but is not bound in the Inversify container. ` +
          `Add a binding in container.ts or the appropriate *.module.ts.`
      );
    }
    return new controller();
  },
};
