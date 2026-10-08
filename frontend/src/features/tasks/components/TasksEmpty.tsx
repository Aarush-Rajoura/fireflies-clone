import { Plus, Rows2 } from "lucide-react";

import { Button, EmptyState } from "@/components/ui";

export type TasksEmptyProps = {
  onNew: () => void;
  /** Shown when filters hide every task, so the way back is one click. */
  onClearFilters?: () => void;
};

/** The empty Tasks view, worded exactly as in the reference. */
export function TasksEmpty({ onNew, onClearFilters }: TasksEmptyProps) {
  return (
    <EmptyState
      className="py-24"
      icon={<Rows2 strokeWidth={1.5} />}
      title="All your meeting tasks in one place"
      description="Manage, assign and update all your meeting tasks here."
      action={
        <div className="flex items-center gap-2">
          {onClearFilters && <Button onClick={onClearFilters}>Clear filters</Button>}
          <Button variant="primary" leadingIcon={<Plus strokeWidth={1.75} />} onClick={onNew}>
            New
          </Button>
        </div>
      }
    />
  );
}
