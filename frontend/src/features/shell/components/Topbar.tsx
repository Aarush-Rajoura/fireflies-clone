"use client";

import { usePathname } from "next/navigation";

import { Badge, Button } from "@/components/ui";
import { SearchDropdown } from "@/features/search";

import { titleForPath } from "../nav";
import { FREE_MEETINGS } from "../plan";

import { CaptureMenu } from "./CaptureMenu";
import { useComingSoon } from "./ComingSoonDialog";
import { NotificationsButton } from "./NotificationsButton";

/**
 * 56px bar: title · centred search · plan badge + Upgrade · bell · Capture.
 * The side columns are equal fr tracks, so the search sits centred in the
 * content area (the rail is outside this bar). The action column never goes
 * below its max-content width, so when space runs out the search shrinks
 * first and nothing on the right wraps.
 */
export function Topbar() {
  const title = titleForPath(usePathname() ?? "");
  const upgrade = useComingSoon();
  return (
    <header className="z-topbar grid h-topbar shrink-0 grid-cols-[minmax(96px,1fr)_minmax(160px,400px)_minmax(max-content,1fr)] items-center gap-4 border-b border-subtle bg-surface-1 px-4">
      <h1 className="truncate text-body-strong text-primary">{title}</h1>
      <SearchDropdown />
      <div className="flex shrink-0 items-center justify-end gap-3 whitespace-nowrap">
        <span className="hidden shrink-0 items-center gap-2 whitespace-nowrap text-meta text-secondary lg:flex">
          <Badge tone="count">{FREE_MEETINGS.left}</Badge>
          Free meetings
        </span>
        <Button
          variant="upgrade"
          size="sm"
          onClick={() =>
            upgrade.show({
              title: "Upgrade",
              message: "Paid plans with unlimited meetings and storage are coming soon.",
            })
          }
        >
          Upgrade
        </Button>
        <span aria-hidden className="h-6 w-px bg-divider" />
        <NotificationsButton />
        <CaptureMenu />
      </div>
      {upgrade.dialog}
    </header>
  );
}
