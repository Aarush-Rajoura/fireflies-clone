export { SoundbitesPanel, type SoundbitesPanelProps } from "./components/SoundbitesPanel";
export {
  CreateSoundbiteModal,
  type CreateSoundbiteModalProps,
  type SoundbiteDraft,
} from "./components/CreateSoundbiteModal";
export { useSoundbites, useCreateSoundbite, useDeleteSoundbite } from "./hooks/useSoundbites";
export { useClipPlayer, type PlayableClip } from "./hooks/useClipPlayer";
export {
  clipRangeError,
  clipRangeForSegment,
  formatClipRange,
  MAX_CLIP_MS,
  MIN_CLIP_MS,
  type ClipRange,
} from "./lib/range";
