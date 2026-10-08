"use client";

import { useState } from "react";

import { SegmentedControl } from "@/components/ui";
import { useTheme } from "@/features/theme";

import { ProfileTab } from "./ProfileTab";

type Tab = "profile" | "appearance";

const TABS = [
  { value: "profile", label: "Profile" },
  { value: "appearance", label: "Appearance" },
] as const;

const THEME_OPTIONS = [
  { value: "dark", label: "Dark" },
  { value: "light", label: "Light" },
  { value: "system", label: "System" },
] as const;

function AppearanceTab() {
  const { preference, setPreference } = useTheme();
  return (
    <div className="flex flex-col gap-3 rounded-card border border-subtle bg-surface-1 p-5">
      <p className="text-body-strong text-primary">Theme</p>
      <SegmentedControl
        label="Theme"
        value={preference}
        onChange={setPreference}
        options={THEME_OPTIONS}
        className="self-start"
      />
      <p className="text-meta text-muted">
        Dark is the default. System follows your operating system&apos;s light or dark setting.
      </p>
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
