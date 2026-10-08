"use client";

import { PanelLeft } from "lucide-react";
import { usePathname } from "next/navigation";
import { Fragment } from "react";

import { IconButton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { NAV_FOOTER, NAV_GROUPS, isActive } from "../nav";

import { ProfileMenu } from "./ProfileMenu";
import { RailItem } from "./RailItem";

export type IconRailProps = {
  expanded: boolean;
  onToggle: () => void;
  /** Animate width changes; off for the post-hydration restore so the rail doesn't slide on load. */
  animate?: boolean;
};

/** The left rail: 64px of icons with tooltips, or 240px with labels. */
export function IconRail({ expanded, onToggle, animate = false }: IconRailProps) {
  const pathname = usePathname() ?? "";
  const toggle = (
    <IconButton
      label={expanded ? "Collapse sidebar" : "Expand sidebar"}
      icon={<PanelLeft strokeWidth={1.75} />}
      onClick={onToggle}
      tooltip={!expanded}
      aria-expanded={expanded}
      className="text-muted"
    />
  );

  return (
    <aside
      aria-label="Main navigation"
      className={cn(
        "flex h-full shrink-0 flex-col border-r border-subtle bg-surface-1",
        animate && "transition-[width] duration-base ease-ff",
        expanded ? "w-60" : "w-rail",
      )}
    >
      <div
        className={cn(
          "flex h-topbar shrink-0 items-center gap-1",
          expanded ? "px-3" : "justify-center",
        )}
      >
        <ProfileMenu expanded={expanded} />
        {expanded && toggle}
      </div>

      <nav
        aria-label="Primary"
        className={cn("flex flex-1 flex-col gap-1 py-2", expanded ? "px-3" : "items-center")}
      >
        {NAV_GROUPS.map((group, i) => (
          <Fragment key={i}>
            {i > 0 && (
              <hr
                aria-hidden
                className={cn("my-1.5 border-subtle", expanded ? "w-full" : "w-10")}
              />
            )}
            {group.map((item) => (
              <RailItem
                key={item.id}
                item={item}
                expanded={expanded}
                active={isActive(pathname, item.href)}
              />
            ))}
          </Fragment>
        ))}
      </nav>

      <nav
        aria-label="Workspace"
        className={cn("flex flex-col gap-1 pb-3", expanded ? "px-3" : "items-center")}
      >
        {NAV_FOOTER.map((item) => (
          <RailItem
            key={item.id}
            item={item}
            expanded={expanded}
            active={isActive(pathname, item.href)}
          />
        ))}
        {/* Collapsed, the avatar owns the top slot, so the expand control sits at the foot of the rail. */}
        {!expanded && toggle}
      </nav>
    </aside>
  );
}
