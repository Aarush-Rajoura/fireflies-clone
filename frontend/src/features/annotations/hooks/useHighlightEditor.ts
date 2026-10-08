"use client";

import { useCallback, useState } from "react";

import type { ToolbarAnchor } from "@/components/ui";

export type HighlightEditTarget = { id: number; anchor: ToolbarAnchor };

function measure(id: number, mark: HTMLElement): ToolbarAnchor | null {
  // A re-render may have replaced the mark; find the current one by its id.
  const el = mark.isConnected
    ? mark
    : document.querySelector<HTMLElement>(`mark[data-range-id="${id}"]`);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, left: r.left, right: r.right };
}

/**
 * Which saved highlight is being edited. `open` matches the transcript's
 * `onHighlightClick(rangeId, mark)` slot; placeholders still being saved
 * (negative ids) cannot be edited yet. `reposition` follows the mark when the
 * transcript scrolls.
 */
export function useHighlightEditor() {
  const [state, setState] = useState<(HighlightEditTarget & { mark: HTMLElement }) | null>(null);

  const open = useCallback((rangeId: string, mark: HTMLElement) => {
    const id = Number(rangeId);
    if (!Number.isInteger(id) || id <= 0) return;
    const anchor = measure(id, mark);
    if (anchor) setState({ id, anchor, mark });
  }, []);

  const reposition = useCallback(() => {
    setState((s) => {
      if (!s) return s;
      const anchor = measure(s.id, s.mark);
      return anchor ? { ...s, anchor } : null;
    });
  }, []);

  const close = useCallback(() => setState(null), []);
  const target: HighlightEditTarget | null = state && { id: state.id, anchor: state.anchor };
  return { target, open, close, reposition };
}
