import {
  Calendar,
  CheckCheck,
  ListChecks,
  ListCollapse,
  MessageCircleQuestion,
  Sparkles,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { createElement, type ReactElement } from "react";

/** The API names icons (so it stays UI-agnostic); this maps them to glyphs we ship. */
const ICONS: Record<string, LucideIcon> = {
  "list-checks": ListChecks,
  "check-check": CheckCheck,
  "list-collapse": ListCollapse,
  "wand-sparkles": WandSparkles,
  calendar: Calendar,
  "message-circle-question": MessageCircleQuestion,
};

export function skillIcon(name: string | null | undefined): LucideIcon {
  return (name && ICONS[name]) || Sparkles;
}

/** The skill's glyph as an element, so callers never pick a component type during render. */
export function skillGlyph(name: string | null | undefined): ReactElement {
  return createElement(skillIcon(name), { strokeWidth: 1.75 });
}
