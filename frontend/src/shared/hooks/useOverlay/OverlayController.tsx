import { useEffect, useImperativeHandle, useState } from 'react';

import type { CreateOverlayElement } from './types';
import type { Ref } from 'react';

interface Props {
  overlayElement: CreateOverlayElement;
  onExit: () => void;
  ref: Ref<OverlayControlRef>;
}

export interface OverlayControlRef {
  close: () => void;
}

export const OverlayController = function OverlayController({
  overlayElement: OverlayElement,
  onExit,
  ref,
}: Props) {
  const [isOpenOverlay, setIsOpenOverlay] = useState(false);

  const handleOverlayClose = () => {
    setIsOpenOverlay(false);
  };

  useImperativeHandle(ref, () => {
    return { close: handleOverlayClose };
  }, [handleOverlayClose]);

  useEffect(() => {
    // NOTE: Without requestAnimationFrame, the open animation sometimes doesn't run.
    requestAnimationFrame(() => {
      setIsOpenOverlay(true);
    });
  }, []);

  return (
    <OverlayElement
      isOpen={isOpenOverlay}
      close={handleOverlayClose}
      exit={onExit}
    />
  );
};
