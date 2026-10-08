"use client";

import { usePathname } from "next/navigation";

import { Badge, Button } from "@/components/ui";

import { titleForPath } from "../nav";

import { CaptureMenu } from "./CaptureMenu";
import { useComingSoon } from "./ComingSoonDialog";
import { GlobalSearch } from "./GlobalSearch";
import { NotificationsButton } from "./NotificationsButton";

const FREE_MEETINGS_LEFT = 3;

/** 56px bar: title · centred search · plan badge + Upgrade · bell · Capture. */
export function Topbar() {
  const title = titleForPath(usePathname() ?? "");
  const upgrade = useComingSoon();
  return (
    <header className="z-topbar grid h-topbar shrink-0 grid-cols-[1fr_minmax(0,400px)_1fr] items-center gap-4 border-b border-subtle bg-surface-1 px-4">
      <h1 className="truncate text-body-strong text-primary">{title}</h1>
      <GlobalSearch />
      <div className="flex items-center justify-end gap-3">
        <span className="hidden items-center gap-2 whitespace-nowrap text-meta text-secondary lg:flex">
          <Badge tone="count">{FREE_MEETINGS_LEFT}</Badge>
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
