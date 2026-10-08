import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { IconButton } from "./icon-button";

export type SidePanelProps = {
  title: string;
  /** Shown after the title in muted figures, e.g. a count. */
  meta?: ReactNode;
  onClose: () => void;
  /** Extra header buttons before Close, e.g. "New chat". */
  actions?: ReactNode;
  id?: string;
  children: ReactNode;
  /** Pinned under the scrolling body, e.g. a composer. */
  footer?: ReactNode;
  className?: string;
};

/**
 * An in-page flyout column (comments, soundbites): fixed header, scrolling
 * body, optional pinned footer. Not a dialog, so the page stays usable beside it.
 */
export function SidePanel({
  title,
  meta,
  onClose,
  actions,
  id,
  children,
  footer,
  className,
}: SidePanelProps) {
  return (
    <aside
      id={id}
      aria-label={title}
      onKeyDown={(e) => {
        // Portalled menus and dialogs bubble here through React; Escape there is theirs.
        if (e.key !== "Escape" || e.defaultPrevented) return;
        if (!e.currentTarget.contains(e.target as Node)) return;
        onClose();
      }}
      className={cn("flex h-full min-h-0 flex-col border-r border-subtle bg-surface-1", className)}
    >
      <header className="flex h-12 shrink-0 items-center justify-between gap-2 border-b border-subtle pl-4 pr-2">
        <h2 className="flex items-baseline gap-1.5 text-body-strong text-strong">
          {title}
          {meta !== undefined && <span className="tnum text-meta text-muted">{meta}</span>}
        </h2>
        <div className="flex items-center gap-1">
          {actions}
          <IconButton
            label={`Close ${title}`}
            size="sm"
            icon={<X strokeWidth={1.75} />}
            onClick={onClose}
          />
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      {footer && <div className="shrink-0 border-t border-subtle p-3">{footer}</div>}
    </aside>
  );
}
