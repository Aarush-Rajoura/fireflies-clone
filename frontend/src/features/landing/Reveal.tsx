"use client";

import type { ReactNode } from "react";
import { useReveal } from "./useReveal";

/** Wraps a block so it fades up when scrolled into view. `delay` staggers siblings (ms). */
export function Reveal({
  children,
  className = "",
  delay = 0,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
}) {
  const { ref, visible } = useReveal<HTMLDivElement>();
  return (
    <div
      ref={ref}
      data-visible={visible}
      className={`mk-reveal ${className}`}
      style={delay ? { transitionDelay: `${delay}ms` } : undefined}
    >
      {children}
    </div>
  );
}
