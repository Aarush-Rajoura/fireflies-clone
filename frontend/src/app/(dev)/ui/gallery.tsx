"use client";

import {
  Bell,
  Calendar,
  CheckSquare,
  ListTodo,
  Mic,
  MoreHorizontal,
  PanelLeft,
  Plus,
  Settings,
  Trash2,
  Upload,
  Video,
} from "lucide-react";
import { useState, type ReactNode } from "react";

import {
  Avatar,
  AvatarGroup,
  Badge,
  Button,
  Checkbox,
  Chip,
  ComingSoon,
  ConfirmDialog,
  DatePicker,
  EmptyState,
  Field,
  Highlighter,
  IconButton,
  Input,
  Kbd,
  Menu,
  Modal,
  Popover,
  ResizablePanels,
  SearchInput,
  SegmentedControl,
  Select,
  Skeleton,
  SkeletonCardsIllustration,
  SkeletonRow,
  SoonBadge,
  SplitButton,
  StateView,
  Switch,
  Textarea,
  toast,
  Toaster,
  Tooltip,
} from "@/components/ui";

const icon = (Icon: typeof Bell) => <Icon strokeWidth={1.75} />;

const captureItems = [
  { label: "Add to live meeting", icon: icon(Video), onSelect: () => toast.info("Add to live meeting") },
  { label: "Schedule new meeting", icon: icon(Calendar), onSelect: () => toast.info("Schedule new meeting") },
  { label: "Upload audio or video", icon: icon(Upload), onSelect: () => toast.info("Upload audio or video") },
  { label: "Start recording", icon: icon(Mic), onSelect: () => toast.info("Start recording") },
];

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-3 border-b border-subtle py-6">
      <h2 className="text-label uppercase text-muted">{title}</h2>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}

const transcript = "We agreed to ship the <script>alert(1)</script> fix on Friday, then review the Friday metrics.";
const matches = [...transcript.matchAll(/Friday|<script>/g)].map((m) => ({ start: m.index, end: m.index + m[0].length }));

export function Gallery({ theme }: { theme: string }) {
  const [tab, setTab] = useState<"recent" | "upcoming" | "feed">("recent");
  const [tasks, setTasks] = useState<"mine" | "all">("mine");
  const [chip, setChip] = useState("All");
  const [modal, setModal] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [date, setDate] = useState("2026-10-07");
  const [active, setActive] = useState(0);
  const [stateMode, setStateMode] = useState<"loading" | "error" | "empty" | "data">("loading");

  return (
    <div className="mx-auto flex max-w-content flex-col px-8 py-6">
      <header className="flex items-center justify-between gap-4 rounded-lg border border-subtle bg-surface-1 px-4 py-2.5">
        <div className="flex items-center gap-3">
          <IconButton label="Toggle sidebar" icon={icon(PanelLeft)} />
          <span className="whitespace-nowrap text-body text-secondary">{theme} theme</span>
        </div>
        <div className="w-full max-w-[400px]">
          <SearchInput label="Search meetings" placeholder="Search by title or keyword" hint={<Kbd keys={["Ctrl", "K"]} />} />
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-2 whitespace-nowrap text-sm text-secondary">
            <Badge tone="count">3</Badge>Free meetings
          </span>
          <IconButton label="Notifications" icon={icon(Bell)} />
          <SplitButton label="Capture" icon={icon(Video)} onClick={() => toast.success("Capture started")} items={captureItems} menuLabel="More capture options" />
        </div>
      </header>

      <Section title="Buttons">
        <Button variant="primary" leadingIcon={icon(Plus)}>New</Button>
        <Button variant="secondary" leadingIcon={icon(Plus)}>Channel</Button>
        <Button variant="ghost">Share Feedback</Button>
        <Button variant="danger" leadingIcon={icon(Trash2)}>Delete</Button>
        <Button variant="primary" size="sm">Small</Button>
        <Button variant="primary" loading>Saving</Button>
        <Button variant="secondary" disabled>Disabled</Button>
        <IconButton label="Settings" variant="secondary" icon={icon(Settings)} />
        <IconButton label="More" size="sm" icon={icon(MoreHorizontal)} />
      </Section>

      <Section title="Segmented control · chips · badges">
        <SegmentedControl label="Home feed" value={tab} onChange={setTab} options={[{ value: "recent", label: "Recent" }, { value: "upcoming", label: "Upcoming" }, { value: "feed", label: "AI Feed" }]} />
        <SegmentedControl label="Task scope" value={tasks} onChange={setTasks} options={[{ value: "mine", label: "My Tasks" }, { value: "all", label: "All Tasks" }]} />
        <div className="flex flex-wrap gap-2">
          {["All", "Audio recording", "CRM", "MCP"].map((c) => (
            <Chip key={c} selected={chip === c} onClick={() => setChip(c)}>{c}</Chip>
          ))}
          <Chip onRemove={() => toast.undo("Filter removed", () => toast.info("Filter restored"))}>Hosted by me</Chip>
        </div>
        <Badge tone="success">New</Badge>
        <Badge tone="accent">Beta</Badge>
        <Badge tone="danger">Rec</Badge>
        <Badge tone="warning">Due soon</Badge>
        <Badge>Draft</Badge>
        <SoonBadge />
      </Section>

      <Section title="Form controls">
        <div className="grid w-full grid-cols-2 gap-4">
          <Field label="Meeting title" htmlFor={`title-${theme}`} hint="Shown in the meeting list">
            <Input id={`title-${theme}`} placeholder="Weekly product sync" />
          </Field>
          <Field label="Template" htmlFor={`tpl-${theme}`}>
            <Select id={`tpl-${theme}`} placeholder="Choose a note template" options={[{ value: "general", label: "General" }, { value: "sales", label: "Sales call" }, { value: "standup", label: "Stand-up" }]} />
          </Field>
          <Field label="Notes" htmlFor={`notes-${theme}`} error="Notes can't be empty">
            <Textarea id={`notes-${theme}`} invalid placeholder="Add a note" />
          </Field>
          <div className="flex flex-col gap-3">
            <DatePicker label="Due date" value={date} onChange={setDate} />
            <Checkbox label="Send recap to attendees" defaultChecked />
            <Checkbox aria-label="Partially selected" checked="indeterminate" />
            <Switch label="Auto-join calendar meetings" defaultChecked />
          </div>
        </div>
      </Section>

      <Section title="Avatars · menu · popover · tooltip · dialogs · toasts">
        <Avatar name="Aarush Rajoura" size="lg" />
        <Avatar name="Maya Chen" />
        <Avatar name="Sam" size="sm" />
        <AvatarGroup names={["Aarush Rajoura", "Maya Chen", "Sam Patel", "Lena Ortiz", "Kiran Rao"]} />
        <Menu trigger={<Button variant="secondary">Menu</Button>} items={[...captureItems, { type: "separator" }, { label: "Delete", icon: icon(Trash2), danger: true, onSelect: () => setConfirm(true) }]} />
        <Popover label="Filters" trigger={<Button variant="secondary" leadingIcon={icon(ListTodo)}>Filters</Button>}>
          <div className="flex flex-col gap-2">
            <Checkbox label="Hosted by me" defaultChecked />
            <Checkbox label="Shared with me" />
          </div>
        </Popover>
        <Tooltip content="Ask Fred about this meeting"><Button variant="ghost">Hover me</Button></Tooltip>
        <Button variant="secondary" onClick={() => setModal(true)}>Modal</Button>
        <Button variant="secondary" onClick={() => setConfirm(true)}>Confirm</Button>
        <Button variant="secondary" onClick={() => toast.success("Meeting renamed")}>Toast success</Button>
        <Button variant="secondary" onClick={() => toast.error("Couldn't save", { retry: () => toast.success("Saved") })}>Toast error</Button>
        <Modal open={modal} onOpenChange={setModal} title="Rename meeting" description="Everyone with access will see the new name." footer={<><Button variant="ghost" onClick={() => setModal(false)}>Cancel</Button><Button variant="primary" onClick={() => setModal(false)}>Save</Button></>}>
          <Input aria-label="Meeting name" defaultValue="Fireflies AI Platform Quick Overview" />
        </Modal>
        <ConfirmDialog open={confirm} onOpenChange={setConfirm} danger title="Delete meeting?" description="This removes the recording, transcript and notes." confirmLabel="Delete" onConfirm={() => { setConfirm(false); toast.undo("Meeting deleted", () => toast.info("Restored")); }} />
      </Section>

      <Section title="Highlighter">
        <p className="w-full text-transcript text-primary">
          <Highlighter text={transcript} ranges={matches} activeIndex={active} />
        </p>
        <Button size="sm" variant="secondary" onClick={() => setActive((a) => (a + 1) % matches.length)}>Next match ({active + 1} of {matches.length})</Button>
      </Section>

      <Section title="State view · skeleton · empty states">
        <SegmentedControl size="sm" label="State" value={stateMode} onChange={setStateMode} options={[{ value: "loading", label: "Loading" }, { value: "error", label: "Error" }, { value: "empty", label: "Empty" }, { value: "data", label: "Data" }]} />
        <div className="w-full">
          <StateView
            query={{ isLoading: stateMode === "loading", isError: stateMode === "error", data: stateMode === "empty" ? [] : ["Weekly product sync"], refetch: () => setStateMode("loading") }}
            isEmpty={(d) => d.length === 0}
            empty={<EmptyState icon={icon(CheckSquare)} title="All your meeting tasks in one place" description="Manage, assign and update all your meeting tasks here." action={<Button variant="primary" leadingIcon={icon(Plus)}>New</Button>} />}
          >
            {(d) => <p className="text-title-row text-primary">{d[0]}</p>}
          </StateView>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Skeleton className="h-4 w-1/3" />
          <SkeletonRow />
        </div>
        <EmptyState className="w-full max-w-lg" illustration={<SkeletonCardsIllustration />} title="Looks like you haven't recorded a meeting yet" description="Once you record your first meeting with Fireflies, it'll show up right here." action={<Button variant="primary" leadingIcon={icon(Plus)}>Capture</Button>} />
        <ComingSoon title="Analytics" />
      </Section>

      <Section title="Resizable panels">
        <div className="h-40 w-full overflow-hidden rounded-lg border border-subtle">
          <ResizablePanels storageKey={`dev-ui-split-${theme}`} defaultSize={40} minSize={25} maxSize={75}
            start={<div className="h-full bg-surface-1 p-4 text-body text-secondary">Summary</div>}
            end={<div className="h-full p-4 text-body text-secondary">Transcript</div>} />
        </div>
      </Section>
      {theme === "Dark" && <Toaster />}
    </div>
  );
}
