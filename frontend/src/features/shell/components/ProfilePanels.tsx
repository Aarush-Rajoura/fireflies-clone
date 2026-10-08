"use client";

import { ArrowRight, Globe, Smartphone, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { Badge, Button, toast } from "@/components/ui";
import { nextPreference, useTheme } from "@/features/theme";
import type { Usage } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

const soon = (what: string) => () => toast.info(`${what} is coming soon.`);

const rowClass =
  "flex h-10 w-full items-center gap-2 px-5 text-left text-body text-menu transition-colors duration-fast hover:bg-surface-hover hover:text-primary";

function Meter({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="meter"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="h-1 overflow-hidden rounded-full bg-surface-3"
    >
      <div className="h-full rounded-full bg-count" style={{ width: `${value * 100}%` }} />
    </div>
  );
}

function Section({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("border-b border-subtle px-5 py-4", className)}>{children}</div>;
}

const ratio = (part: number, whole: number) => (whole > 0 ? Math.min(part / whole, 1) : 0);

export function AccountPanel({
  name,
  email,
  usage,
  onNavigate,
}: {
  name: string;
  email: string;
  /** Undefined while loading: the meters render empty rather than guessing. */
  usage: Usage | undefined;
  onNavigate: () => void;
}) {
  const { preference, setPreference } = useTheme();
  const left = usage?.free_meetings_left ?? 0;
  const total = usage?.free_meetings_total ?? 0;
  const used = usage?.storage_minutes_used ?? 0;
  const storage = usage?.storage_minutes_total ?? 0;
  return (
    <div className="w-[320px] overflow-hidden rounded-panel border border-subtle bg-surface-2">
      <Section>
        <p className="truncate text-h3 text-strong">Hi {name}</p>
        <p className="truncate text-meta text-muted">{email}</p>
      </Section>
      <Section className="flex flex-col gap-3">
        <p className="text-body-strong text-primary">Free</p>
        <Meter value={ratio(left, total)} label="Free meetings left" />
        <p className="text-meta text-muted">
          {usage ? `${left} left / ${total} free meetings` : "Loading plan…"}
        </p>
        <Button
          variant="upgrade"
          leadingIcon={<Zap strokeWidth={1.75} />}
          onClick={soon("Upgrading")}
        >
          Upgrade
        </Button>
      </Section>
      <Section className="flex flex-col gap-3">
        <p className="text-body-strong text-primary">Storage</p>
        <Meter value={ratio(used, storage)} label="Storage used" />
        <p className="tnum text-meta text-muted">
          {usage ? `${used} / ${storage} mins` : "Loading storage…"}
        </p>
      </Section>
      <div className="border-b border-subtle py-1">
        <button type="button" className={rowClass} onClick={soon("Refer and Earn")}>
          Refer and Earn $5
        </button>
      </div>
      <nav aria-label="Account" className="py-1">
        <button type="button" className={rowClass} onClick={soon("Playlists")}>
          Playlist
        </button>
        <Link href="/settings" className={rowClass} onClick={onNavigate}>
          Settings
        </Link>
        <Link href="/team" className={rowClass} onClick={onNavigate}>
          My Team
        </Link>
        <button type="button" className={rowClass} onClick={soon("Managing web logins")}>
          Manage Web Logins
        </button>
        <button type="button" className={rowClass} onClick={soon("Platform rules")}>
          Platform Rules
        </button>
        {/* Cycles Dark → Light → System; Settings → Appearance has the explicit choice. */}
        <button
          type="button"
          aria-label={`Theme: ${preference}. Switch to ${nextPreference(preference)}`}
          className={rowClass}
          onClick={() => setPreference(nextPreference(preference))}
        >
          <span>Theme</span>
          <Badge tone="accent">Beta</Badge>
          <span className="ml-auto capitalize text-muted">{preference}</span>
        </button>
        <Link href="/" className={rowClass} onClick={onNavigate}>
          Logout
        </Link>
      </nav>
    </div>
  );
}

function AppCard({
  icon,
  title,
  children,
}: {
  icon: ReactNode;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-panel border border-subtle bg-surface-2 p-5">
      <span className="text-accent [&_svg]:size-6">{icon}</span>
      <div>
        <p className="text-body-strong text-primary">{title}</p>
        {children}
      </div>
    </div>
  );
}

export function AppCards() {
  return (
    <div className="flex w-[360px] flex-col gap-2">
      <AppCard icon={<Smartphone strokeWidth={1.75} />} title="Mobile App">
        <p className="text-body text-secondary">
          Transcribe and summarize in-person conversations with mobile app.
        </p>
        <div className="mt-3 flex gap-2">
          <Button size="sm" onClick={soon("The iOS app")}>
            App Store
          </Button>
          <Button size="sm" onClick={soon("The Android app")}>
            Google Play
          </Button>
        </div>
      </AppCard>
      <AppCard icon={<Globe strokeWidth={1.75} />} title="Chrome Extension">
        <p className="text-body text-secondary">
          Record and transcribe Google Meet calls without Fireflies notetaker bot.
        </p>
        <Button size="sm" className="mt-3" onClick={soon("The Chrome extension")}>
          Install
        </Button>
      </AppCard>
      <button
        type="button"
        onClick={soon("The desktop app")}
        className="flex items-center gap-3 rounded-panel border border-accent-border bg-accent-faint px-4 py-3 text-left text-body-strong text-primary hover:bg-accent-subtle"
      >
        <span className="flex-1">Download Fireflies Desktop App</span>
        <ArrowRight className="size-4" strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
