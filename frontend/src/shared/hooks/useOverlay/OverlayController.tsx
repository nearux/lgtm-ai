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
    // NOTE: requestAnimationFrame이 없으면 가끔 Open 애니메이션이 실행되지 않는다.
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
