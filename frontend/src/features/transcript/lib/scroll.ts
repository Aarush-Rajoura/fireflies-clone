/** The row element for a segment, found through its data attribute so rows need no ref map. */
export function rowElement(container: HTMLElement | null, index: number): HTMLElement | null {
  return container?.querySelector<HTMLElement>(`[data-segment-index="${index}"]`) ?? null;
}

export function isRowVisible(container: HTMLElement, row: HTMLElement): boolean {
  const box = container.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  return r.top >= box.top && r.bottom <= box.bottom;
}

/** Centres a row in its scroll container. `scrollIntoView` is optional because jsdom lacks it. */
export function scrollRowIntoView(container: HTMLElement | null, index: number): void {
  rowElement(container, index)?.scrollIntoView?.({ behavior: "smooth", block: "center" });
}
