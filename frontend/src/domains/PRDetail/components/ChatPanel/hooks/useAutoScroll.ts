import { useEffect, useRef } from 'react';

const BOTTOM_THRESHOLD = 50;

export const useAutoScroll = <T>(deps: T) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const isNearBottomRef = useRef(true);

  const handleScroll = () => {
    const el = containerRef.current;
    if (!el) return;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    isNearBottomRef.current = distanceFromBottom <= BOTTOM_THRESHOLD;
  };

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !isNearBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [deps]);

  return { containerRef, handleScroll };
};
