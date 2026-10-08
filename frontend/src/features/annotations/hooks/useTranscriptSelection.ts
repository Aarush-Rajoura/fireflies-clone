"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

import type { ToolbarAnchor } from "@/components/ui";

import { resolveSelection, type SegmentSelection } from "../lib/selection";

export type TranscriptSelectionState =
  | { kind: "segment"; selection: SegmentSelection; anchor: ToolbarAnchor }
  | { kind: "cross-segment"; anchor: ToolbarAnchor };

function anchorOf(range: Range): ToolbarAnchor {
  // jsdom has no layout; a zero rect keeps the toolbar logic testable there.
  const r = range.getBoundingClientRect?.();
  return r
    ? { top: r.top, bottom: r.bottom, left: r.left, right: r.right }
    : { top: 0, bottom: 0, left: 0, right: 0 };
}

/**
 * Watches the document selection and reports it once the user lets go (mouse
 * or keyboard), resolved to one transcript line inside `scopeRef`. It follows
 * the selection while the page scrolls and clears when the selection collapses.
 */
export function useTranscriptSelection(scopeRef: RefObject<HTMLElement | null>) {
  const [state, setState] = useState<TranscriptSelectionState | null>(null);
  const range = useRef<Range | null>(null);

  const clear = useCallback(() => {
    range.current = null;
    setState(null);
    window.getSelection()?.removeAllRanges();
  }, []);

  useEffect(() => {
    const read = () => {
      const scope = scopeRef.current;
      const selection = window.getSelection();
      const resolved = scope ? resolveSelection(selection, scope) : { kind: "none" as const };
      if (resolved.kind === "none" || !selection) {
        range.current = null;
        setState(null);
        return;
      }
      range.current = selection.getRangeAt(0).cloneRange();
      const anchor = anchorOf(range.current);
      setState(
        resolved.kind === "segment"
          ? { kind: "segment", selection: resolved, anchor }
          : { kind: "cross-segment", anchor },
      );
    };
    // The selection is final only after the pointer or key is released.
    const onRelease = () => window.setTimeout(read, 0);
    const onKeyUp = (e: KeyboardEvent) => {
      if (e.shiftKey || e.key === "Shift" || ((e.ctrlKey || e.metaKey) && e.key === "a"))
        onRelease();
    };
    const onSelectionChange = () => {
      if (range.current && window.getSelection()?.isCollapsed) {
        range.current = null;
        setState(null);
      }
    };
    const onScroll = () => {
      const current = range.current;
      if (current) setState((s) => s && { ...s, anchor: anchorOf(current) });
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && range.current) {
        range.current = null;
        setState(null);
      }
    };

    document.addEventListener("pointerup", onRelease);
    document.addEventListener("keyup", onKeyUp);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("selectionchange", onSelectionChange);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("pointerup", onRelease);
      document.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("selectionchange", onSelectionChange);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onScroll);
    };
  }, [scopeRef]);

  return { state, clear };
}
