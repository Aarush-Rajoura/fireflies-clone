"use client";

import { useCallback, useState } from "react";

/**
 * Tracks an element's content width so SVG charts draw in real pixels:
 * text stays at its design size instead of scaling with a viewBox.
 */
export function useElementWidth<T extends HTMLElement>(): [(el: T | null) => void, number] {
  const [width, setWidth] = useState(0);
  const ref = useCallback((el: T | null) => {
    if (!el) return;
    setWidth(el.clientWidth);
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setWidth(Math.floor(entry.contentRect.width));
    });
    observer.observe(el);
    // React 19 runs a callback ref's returned function on detach.
    return () => observer.disconnect();
  }, []);
  return [ref, width];
}
