export { SelectionToolbar, type SelectionToolbarProps } from "./components/SelectionToolbar";
export { HighlightEditor, type HighlightEditorProps } from "./components/HighlightEditor";
export { useHighlights, useHighlightRanges } from "./hooks/useHighlights";
export {
  useCreateHighlight,
  useDeleteHighlight,
  useRecolorHighlight,
} from "./hooks/useHighlightMutations";
export { useHighlightEditor, type HighlightEditTarget } from "./hooks/useHighlightEditor";
export { useTranscriptSelection } from "./hooks/useTranscriptSelection";
export {
  resolveRange,
  resolveSelection,
  SEGMENT_TEXT_ATTR,
  type ResolvedSelection,
  type SegmentSelection,
} from "./lib/selection";
