'use client';

import { type RefObject, useEffect, useState } from 'react';

export const EMPTY_REF = { current: null } as RefObject<HTMLElement | null>;

/** True while any part of `ref` is visible in the viewport. */
export function useElementInView(
  ref: RefObject<HTMLElement | null>,
  enabled = true,
  watchKey?: string | number | boolean,
) {
  const [inView, setInView] = useState(false);

  useEffect(() => {
    if (!enabled) {
      setInView(false);
      return;
    }

    const el = ref.current;
    if (!el) {
      setInView(false);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => setInView(entry.isIntersecting),
      { threshold: 0 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [ref, enabled, watchKey]);

  return inView;
}
