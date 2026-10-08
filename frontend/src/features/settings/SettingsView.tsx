"use client";

import { useState } from "react";

import { Avatar, SegmentedControl, Skeleton, SoonBadge, useTheme } from "@/components/ui";
import { useMe } from "@/features/user";

type Tab = "profile" | "appearance";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "appearance", label: "Appearance" },
] as const;

function ProfileTab() {
  const { data: me, isLoading } = useMe();
  if (isLoading || !me) return <Skeleton className="h-16 w-full" />;
  return (
    <div className="flex items-center gap-4 rounded-card border border-subtle bg-surface-1 p-5">
      <Avatar name={me.name} src={me.avatar_url ?? undefined} size="lg" />
      <div className="min-w-0">
        <p className="truncate text-h3 text-strong">{me.name}</p>
        <p className="truncate text-meta text-muted">{me.email}</p>
      </div>
    </div>
  );
}

function AppearanceTab() {
  const { theme } = useTheme();
  return (
    <div className="flex flex-col gap-3 rounded-card border border-subtle bg-surface-1 p-5">
      <div className="flex items-center gap-2">
        <p className="text-body-strong text-primary">Theme</p>
        <SoonBadge />
      </div>
      {/* Light is listed but disabled until the light theme is wired. */}
      <SegmentedControl
        label="Theme"
        value={theme}
        onChange={() => undefined}
        options={[
          { value: "dark", label: "Dark" },
          { value: "light", label: "Light", disabled: true },
        ]}
        className="self-start"
      />
      <p className="text-meta text-muted">Dark is the default. A light theme is coming soon.</p>
    </div>
  );
}

export function SettingsView() {
  const [tab, setTab] = useState<Tab>("profile");
  return (
    <section className="mx-auto flex w-full max-w-content flex-col gap-6 px-6 py-8">
      <SegmentedControl
        label="Settings sections"
        options={TABS}
        value={tab}
        onChange={setTab}
        idPrefix="settings"
        className="self-start"
      />
      <div role="tabpanel" aria-labelledby={`settings-${tab}`}>
        {tab === "profile" ? <ProfileTab /> : <AppearanceTab />}
      </div>
    </section>
  );
}
