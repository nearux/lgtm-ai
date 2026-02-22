import { useEffect, type RefObject } from 'react';

export const useOnClickOutside = <T extends HTMLElement>(
  ref: RefObject<T | null>,
  handler: () => void,
  enabled = true
) => {
  useEffect(() => {
    if (!enabled) return;

    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        handler();
      }
    };

    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [ref, handler, enabled]);
};
