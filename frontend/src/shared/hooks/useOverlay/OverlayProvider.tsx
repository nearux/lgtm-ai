import { createContext, Fragment, useState } from 'react';

import type { PropsWithChildren, ReactNode } from 'react';

export const OverlayContext = createContext<{
  mount(id: string, element: ReactNode): void;
  unmount(id: string): void;
} | null>(null);

OverlayContext.displayName = 'OverlayContext';

export function OverlayProvider({ children }: PropsWithChildren) {
  const [overlayById, setOverlayById] = useState<Map<string, ReactNode>>(
    new Map()
  );

  const mount = (id: string, element: ReactNode) => {
    setOverlayById((overlayById) => {
      const cloned = new Map(overlayById);
      cloned.set(id, element);
      return cloned;
    });
  };

  const unmount = (id: string) => {
    setOverlayById((overlayById) => {
      const cloned = new Map(overlayById);
      cloned.delete(id);
      return cloned;
    });
  };

  const context = { mount, unmount };

  return (
    <OverlayContext.Provider value={context}>
      {children}
      {[...Array.from(overlayById.entries())].map(([id, element]) => (
        <Fragment key={id}>{element}</Fragment>
      ))}
    </OverlayContext.Provider>
  );
}
