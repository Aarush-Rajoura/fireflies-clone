"use client";

import { Plus } from "lucide-react";

import { Button, SegmentedControl, Select, TextButton } from "@/components/ui";
import { useComingSoon } from "@/features/shell";

import { GROUP_LABELS } from "../lib/buckets";
import {
  DUE_BUCKETS,
  type DueBucket,
  type TaskScope,
  type TaskStatusFilter,
  type TasksParams,
} from "../lib/params";

const SCOPE_OPTIONS = [
  { value: "mine", label: "My Tasks" },
  { value: "all", label: "All Tasks" },
] as const;

const STATUS_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "completed", label: "Completed" },
];

const ANY_DUE = "any";
const DUE_OPTIONS = [
  { value: ANY_DUE, label: "Any due date" },
  ...DUE_BUCKETS.map((b) => ({ value: b, label: GROUP_LABELS[b] })),
];

export type TasksToolbarProps = {
  params: TasksParams;
  onChange: (patch: Partial<TasksParams>) => void;
};

/** "My Tasks | All Tasks" and the feedback link, as in the reference. */
export function TasksToolbar({ params, onChange }: TasksToolbarProps) {
  const soon = useComingSoon();
  return (
    <>
      <div className="flex items-center justify-between gap-4">
        <SegmentedControl
          label="Tasks"
          options={SCOPE_OPTIONS}
          value={params.scope}
          onChange={(scope: TaskScope) => onChange({ scope })}
        />
        <TextButton
          tone="plain"
          className="px-1 text-body text-secondary hover:text-primary"
          onClick={() =>
            soon.show({
              title: "Share Feedback",
              message: "Feedback on Tasks will be collected here soon.",
            })
          }
        >
          Share Feedback
        </TextButton>
      </div>
      {soon.dialog}
    </>
  );
}

/** Status and due-date filters, plus "+ New" once the list has content. */
export function TaskFilters({
  params,
  onChange,
  onNew,
}: TasksToolbarProps & { onNew: () => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        label="Status"
        size="sm"
        className="w-40"
        options={STATUS_OPTIONS}
        value={params.status}
        onValueChange={(status) => onChange({ status: status as TaskStatusFilter })}
      />
      <Select
        label="Due date"
        size="sm"
        className="w-40"
        options={DUE_OPTIONS}
        value={params.due ?? ANY_DUE}
        onValueChange={(due) => onChange({ due: due === ANY_DUE ? undefined : (due as DueBucket) })}
      />
      <Button
        variant="primary"
        size="sm"
        className="ml-auto"
        leadingIcon={<Plus strokeWidth={1.75} />}
        onClick={onNew}
      >
        New
      </Button>
    </div>
  );
}
