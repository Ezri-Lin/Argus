import { useEffect, useRef, useState } from "react";

export type MeasuredSize = {
  w: number;
  h: number;
};

/**
 * ResizeObserver wrapped in rAF. Consumers should make layout decisions from
 * the returned contentRect only, not by reading scrollWidth/offsetWidth inside
 * resize reactions.
 */
export function useMeasuredSize<T extends Element>() {
  const ref = useRef<T | null>(null);
  const [size, setSize] = useState<MeasuredSize>({ w: 0, h: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    let raf = 0;
    const obs = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (!rect) return;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        setSize({ w: rect.width, h: rect.height });
      });
    });

    obs.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      obs.disconnect();
    };
  }, []);

  return { ref, size };
}
