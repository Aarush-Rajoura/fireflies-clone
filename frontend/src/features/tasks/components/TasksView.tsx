"use client";

import { useState } from "react";

import { SkeletonRow, StateView } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

import { useTasks } from "../hooks/useTasks";
import { useTasksParams } from "../hooks/useTasksParams";

import { ConnectBanner } from "./ConnectBanner";
import { NewTaskModal } from "./NewTaskModal";
import { TaskGroups } from "./TaskGroups";
import { TaskFilters, TasksToolbar } from "./TasksToolbar";
import { TasksEmpty } from "./TasksEmpty";

/** The Tasks page: scope tabs, the work-apps banner, filters and the due-date groups. Wiring only. */
export function TasksView() {
  const url = useTasksParams();
  const tasks = useTasks(url.query);
  const [creating, setCreating] = useState(false);
  const openNew = () => setCreating(true);
  // The reference's empty view has no filter row; keep it once filters are in play.
  const showFilters = url.filtered || (tasks.data?.length ?? 0) > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto flex w-full max-w-content flex-col gap-6 px-6 pb-16 pt-20">
        <TasksToolbar params={url.params} onChange={url.update} />
        <ConnectBanner />
        {showFilters && <TaskFilters params={url.params} onChange={url.update} onNew={openNew} />}
        <div
          className={cn(
            "transition-opacity duration-fast",
            tasks.isPlaceholderData && "opacity-60",
          )}
          aria-busy={tasks.isFetching || undefined}
        >
          <StateView
            query={tasks}
            isEmpty={(items) => items.length === 0}
            errorMessage="Your tasks couldn't be loaded. Check your connection and try again."
            loading={Array.from({ length: 5 }, (_, i) => (
              <SkeletonRow key={i} className="h-14 px-3" />
            ))}
            empty={
              <TasksEmpty
                onNew={openNew}
                onClearFilters={url.filtered ? url.clearFilters : undefined}
              />
            }
          >
            {(items) => <TaskGroups items={items} />}
          </StateView>
        </div>
      </div>
      <NewTaskModal open={creating} onOpenChange={setCreating} />
    </div>
  );
}
