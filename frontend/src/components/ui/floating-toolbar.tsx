"use client";

import { forwardRef, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils/cn";

import { usePortalContainer } from "./theme-root";

import { floatingSurface } from "./menu";

/** Viewport coordinates of what the toolbar points at (a DOMRect fits). */
export type ToolbarAnchor = { top: number; bottom: number; left: number; right: number };

export type FloatingToolbarProps = {
  anchor: ToolbarAnchor;
  /** Accessible name of the toolbar. */
  label: string;
  children: ReactNode;
  /** Announced shortcut that moves focus into the toolbar, e.g. "Alt+H". */
  keyShortcuts?: string;
  className?: string;
};

const GAP = 8;
const EDGE = 12;

/**
 * A small toolbar floating above (or, without room, below) an on-screen
 * rectangle such as a text selection. Pressing it never steals focus or
 * collapses the selection it acts on.
 */
export const FloatingToolbar = forwardRef<HTMLDivElement, FloatingToolbarProps>(
  function FloatingToolbar({ anchor, label, children, keyShortcuts, className }, forwarded) {
    const container = usePortalContainer();
    const own = useRef<HTMLDivElement | null>(null);
    const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

    // Measured before paint so the toolbar never flashes at the wrong spot.
    useLayoutEffect(() => {
      const el = own.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      const above = anchor.top - GAP - height;
      const top = above >= EDGE ? above : anchor.bottom + GAP;
      const centre = (anchor.left + anchor.right) / 2;
      const maxLeft = window.innerWidth - EDGE - width;
      setPos({ top, left: Math.max(EDGE, Math.min(maxLeft, centre - width / 2)) });
    }, [anchor.top, anchor.bottom, anchor.left, anchor.right]);

    return createPortal(
      <div
        ref={(node) => {
          own.current = node;
          if (typeof forwarded === "function") forwarded(node);
          else if (forwarded) forwarded.current = node;
        }}
        role="toolbar"
        aria-label={label}
        aria-keyshortcuts={keyShortcuts}
        onMouseDown={(e) => {
          // Keep the text selection (and the editor's focus) while a button is pressed.
          if (!(e.target as HTMLElement).closest("input, textarea")) e.preventDefault();
        }}
        style={pos ?? { top: anchor.top, left: anchor.left, visibility: "hidden" }}
        className={cn(floatingSurface, "fixed flex items-center gap-1 p-1", className)}
      >
        {children}
      </div>,
      container ?? document.body,
    );
  },
);
