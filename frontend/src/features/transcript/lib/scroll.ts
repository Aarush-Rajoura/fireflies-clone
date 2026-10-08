/** The row element for a segment, found through its data attribute so rows need no ref map. */
export function rowElement(container: HTMLElement | null, index: number): HTMLElement | null {
  return container?.querySelector<HTMLElement>(`[data-segment-index="${index}"]`) ?? null;
}

export function isRowVisible(container: HTMLElement, row: HTMLElement): boolean {
  const box = container.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  return r.top >= box.top && r.bottom <= box.bottom;
}

/** Share of the container height, at each edge, that counts as "about to leave the view". */
export const FOLLOW_EDGE = 0.15;

/** Off-screen, or within FOLLOW_EDGE of the top/bottom: time to re-centre while playing. */
export function isNearEdge(container: HTMLElement, row: HTMLElement): boolean {
  const box = container.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  const margin = (box.bottom - box.top) * FOLLOW_EDGE;
  return r.top < box.top + margin || r.bottom > box.bottom - margin;
}

/** Centres a row in its scroll container. `scrollIntoView` is optional because jsdom lacks it. */
export function scrollRowIntoView(container: HTMLElement | null, index: number): void {
  rowElement(container, index)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
}
