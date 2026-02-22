import { useContext, useEffect, useRef } from 'react';

import { OverlayContext } from './OverlayProvider';

import { OverlayController, type OverlayControlRef } from './OverlayController';
import type { CreateOverlayElement } from './types';

interface UseOverlayOptions {
  exitOnUnmount?: boolean;
}

const DEFAULT_OVERLAY_ID = 'default-overlay-id';

/**
 * A hook for opening and closing overlays such as modals.
 *
 * @example
 * ```tsx
 * const overlay = useOverlay();
 * overlay.open(({ isOpen, close }) => <Modal isOpen={isOpen} onClose={close} />);
 * overlay.open(({ isOpen, close }) => <Modal isOpen={isOpen} onClose={close} />, 'MODAL_CUSTOM_ID');
 * ```
 *
 * `overlay.open(overlayElement, id?)`
 * - Mounts a new overlay. Replaces an existing overlay if one with the same ID is already open.
 * - overlayElement: ({ isOpen, close }) => React.ReactNode
 * - id: Unique ID for the overlay (default: DEFAULT_OVERLAY_ID)
 *
 * `overlay.close(id)`
 * - Closes the overlay with the given ID.
 *
 * `overlay.exit(id)`
 * - Unmounts the overlay with the given ID.
 *
 * NOTE: Calling `close` does not unmount the overlay.
 * You can explicitly unmount it by calling `overlay.exit`,
 * and when `useOverlay` unmounts, all opened overlays are automatically unmounted.
 *
 * Forked from https://github.com/toss/slash/tree/main/packages/react/use-overlay
 */
export function useOverlay(options: UseOverlayOptions = {}) {
  const context = useContext(OverlayContext);
  const overlayRefMap = useRef<Map<string, OverlayControlRef | null>>(
    new Map()
  );

  if (context == null) {
    throw new Error('useOverlay is only available within OverlayProvider.');
  }

  const { mount, unmount } = context;
  const { exitOnUnmount = true } = options;

  useEffect(() => {
    return () => {
      if (!exitOnUnmount) return;

      const ids = Array.from(overlayRefMap.current.keys());
      ids.forEach((id) => {
        unmount(id);
      });
    };
  }, [exitOnUnmount, unmount]);

  return {
    open: (
      overlayElement: CreateOverlayElement,
      id: string = DEFAULT_OVERLAY_ID
    ) => {
      mount(
        id,
        <OverlayController
          // NOTE: state should be reset every time we open an overlay
          key={Date.now()}
          overlayElement={overlayElement}
          ref={(ref) => {
            overlayRefMap.current.set(id, ref);
          }}
          onExit={() => {
            unmount(id);
          }}
        />
      );
    },
    close: (id: string = DEFAULT_OVERLAY_ID) => {
      overlayRefMap.current.get(id)?.close();
    },
    exit: (id: string = DEFAULT_OVERLAY_ID) => {
      unmount(id);
    },
  };
}
