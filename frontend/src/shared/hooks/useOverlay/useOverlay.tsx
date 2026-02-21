import { useContext, useEffect, useRef } from 'react';

import { OverlayContext } from './OverlayProvider';

import { OverlayController, type OverlayControlRef } from './OverlayController';
import type { CreateOverlayElement } from './types';

interface UseOverlayOptions {
  exitOnUnmount?: boolean;
}

const DEFAULT_OVERLAY_ID = 'default-overlay-id';

/**
 * Modal과 같은 오버레이를 열고 닫을 수 있는 hook입니다.
 *
 * @example
 * ```tsx
 * const overlay = useOverlay();
 * overlay.open(({ isOpen, close }) => <Modal isOpen={isOpen} onClose={close} />);
 * overlay.open(({ isOpen, close }) => <Modal isOpen={isOpen} onClose={close} />, 'MODAL_CUSTOM_ID');
 * ```
 *
 * `overlay.open(overlayElement, id?)`
 * - 오버레이를 새롭게 mount 합니다. 같은 ID를 가지는 오버레이가 이미 열려있는 경우 대체합니다.
 * - overlayElement: ({ isOpen, close }) => React.ReactNode
 * - id: 오버레이의 고유 ID (default: DEFAULT_OVERLAY_ID)
 *
 * `overlay.close(id)`
 * - 해당 ID의 오버레이를 닫습니다.
 *
 * `overlay.exit(id)`
 * - 해당 ID의 오버레이를 unmount 합니다.
 *
 * NOTE: `close`를 호출해도 오버레이가 unmount되는 것은 아닙니다.
 * `overlay.exit`을 호출해서 명시적으로 unmount 할 수 있고,
 * `useOverlay`가 unmount될 때, open했던 모든 오버레이를 자동으로 unmount합니다.
 *
 * fork from https://github.com/toss/slash/tree/main/packages/react/use-overlay
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
