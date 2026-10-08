import type { ReactNode } from "react";
import { ClipboardPaste, FileUp, Film, PencilLine, type LucideIcon } from "lucide-react";

import { SegmentedControl, SoonBadge, type SegmentedOption } from "@/components/ui";

import type { CreateTab } from "../lib/payload";

export const TAB_ID = "create-meeting-tab";
export const PANEL_ID = "create-meeting-panel";

/* Short labels below `sm` so all four tabs fit a phone-width modal without scrolling. */
function TabLabel({
  icon: Icon,
  long,
  short = long,
  soon = false,
}: {
  icon: LucideIcon;
  long: string;
  short?: string;
  soon?: boolean;
}) {
  return (
    <>
      <Icon className="hidden size-4 sm:block" strokeWidth={1.75} />
      {long === short ? (
        long
      ) : (
        <>
          <span className="hidden sm:inline">{long}</span>
          <span className="sm:hidden">{short}</span>
        </>
      )}
      {soon && <SoonBadge className="hidden sm:inline-flex" />}
    </>
  );
}

const TABS: readonly { value: CreateTab; label: ReactNode }[] = [
  { value: "upload", label: <TabLabel icon={FileUp} long="Upload transcript" short="Upload" /> },
  { value: "paste", label: <TabLabel icon={ClipboardPaste} long="Paste" /> },
  { value: "form", label: <TabLabel icon={PencilLine} long="Form" /> },
  {
    value: "media",
    label: <TabLabel icon={Film} long="Upload audio/video" short="Audio/video" soon />,
  },
];

export type CreateMeetingTabsProps = {
  tab: CreateTab;
  onChange: (tab: CreateTab) => void;
  /** While a transcript is being parsed, the other tabs are disabled so its result has a home. */
  locked: boolean;
};

export function CreateMeetingTabs({ tab, onChange, locked }: CreateMeetingTabsProps) {
  const options: SegmentedOption<CreateTab>[] = TABS.map((t) => ({
    ...t,
    disabled: locked && t.value !== tab,
  }));
  return (
    <SegmentedControl
      label="How to add the meeting"
      options={options}
      value={tab}
      onChange={onChange}
      idPrefix={TAB_ID}
      panelIdPrefix={PANEL_ID}
      // Tighter tab padding below `sm` is what lets the four tabs fit at 360px.
      className="max-w-full [&>button]:px-2.5 sm:[&>button]:px-3.5"
    />
  );
}
