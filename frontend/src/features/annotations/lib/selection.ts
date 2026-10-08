/** The attribute the transcript puts on the element whose text is exactly one segment's text. */
export const SEGMENT_TEXT_ATTR = "data-segment-text";
const ROOT_SELECTOR = `[${SEGMENT_TEXT_ATTR}]`;

export type SegmentSelection = {
  kind: "segment";
  segmentId: number;
  /** Half-open `[start, end)` in UTF-16 code units, i.e. JavaScript string indices into the segment text. */
  start: number;
  end: number;
  text: string;
};

export type ResolvedSelection =
  | SegmentSelection
  /** Text from more than one line is selected: annotations live on a single line. */
  | { kind: "cross-segment" }
  /** Nothing usable: collapsed, whitespace only, or outside the transcript text. */
  | { kind: "none" };

const NONE: ResolvedSelection = { kind: "none" };

function elementOf(node: Node): Element | null {
  return node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
}

/** Characters of `root`'s text before the boundary point `(node, offset)`, which must lie inside `root`. */
function offsetWithin(root: Element, node: Node, offset: number): number {
  const range = root.ownerDocument.createRange();
  range.setStart(root, 0);
  range.setEnd(node, offset);
  return range.toString().length;
}

/**
 * Maps a DOM range to string offsets in one transcript line's text.
 *
 * Every segment-text element the range touches contributes the part of its
 * text that is selected. A range that only grazes a neighbour (a triple-click
 * ending at the next line's start, a drag that starts on a speaker name) still
 * counts as one line; real text in two lines is `cross-segment`. Offsets are
 * measured with Range.toString(), so they are string indices into
 * `textContent`, which the transcript keeps equal to the segment text.
 * Leading and trailing whitespace is trimmed off the result.
 */
export function resolveRange(range: Range, scope: Element): ResolvedSelection {
  if (range.collapsed) return NONE;
  const common = elementOf(range.commonAncestorContainer);
  if (!common || !scope.contains(common)) return NONE;

  const own = common.closest(ROOT_SELECTOR);
  const roots = own
    ? [own]
    : [...common.querySelectorAll(ROOT_SELECTOR)].filter((el) => range.intersectsNode(el));

  const spans = roots
    .map((root) => {
      const length = (root.textContent ?? "").length;
      // A root the range touches but does not start (end) in is selected from its start (to its end).
      const start = root.contains(range.startContainer)
        ? offsetWithin(root, range.startContainer, range.startOffset)
        : 0;
      const end = root.contains(range.endContainer)
        ? offsetWithin(root, range.endContainer, range.endOffset)
        : length;
      return { root, start, end };
    })
    .filter((s) => s.end > s.start);

  if (spans.length > 1) return { kind: "cross-segment" };
  const span = spans[0];
  if (!span) return NONE;

  const segmentId = Number(span.root.getAttribute(SEGMENT_TEXT_ATTR));
  if (!Number.isInteger(segmentId)) return NONE;
  const full = span.root.textContent ?? "";
  const raw = full.slice(span.start, span.end);
  const lead = raw.length - raw.trimStart().length;
  const text = raw.trim();
  if (!text) return NONE;
  const start = span.start + lead;
  return { kind: "segment", segmentId, start, end: start + text.length, text };
}

/** The current document selection, resolved against the transcript container `scope`. */
export function resolveSelection(selection: Selection | null, scope: Element): ResolvedSelection {
  if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return NONE;
  return resolveRange(selection.getRangeAt(0), scope);
}
