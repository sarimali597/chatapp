import { useEffect } from 'react';

export function useOutsideClick(ref, handler, active = true) {
  useEffect(() => {
    if (!active) return undefined;

    function listener(event) {
      if (ref.current && !ref.current.contains(event.target)) {
        handler(event);
      }
    }

    document.addEventListener('mousedown', listener);
    return () => document.removeEventListener('mousedown', listener);
  }, [ref, handler, active]);
}
