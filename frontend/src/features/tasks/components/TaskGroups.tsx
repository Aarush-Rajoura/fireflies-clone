import type { ActionItem } from "@/lib/api";
import { cn } from "@/lib/utils/cn";

import { groupTasks, type TaskGroupKey } from "../lib/buckets";

import { TaskRow } from "./TaskRow";

const headingTone: Partial<Record<TaskGroupKey, string>> = {
  overdue: "text-danger",
  today: "text-warning",
};

/** Overdue / Today / This week / Later / No date, then Completed. */
export function TaskGroups({ items, now }: { items: readonly ActionItem[]; now?: Date }) {
  return (
    <div className="flex flex-col gap-6">
      {groupTasks(items, now).map((group) => (
        <section key={group.key} aria-labelledby={`tasks-${group.key}`}>
          <h2
            id={`tasks-${group.key}`}
            className={cn(
              "mb-1 flex items-center gap-2 px-3 text-label uppercase tracking-wide",
              headingTone[group.key] ?? "text-muted",
            )}
          >
            {group.label}
            <span className="tnum font-normal text-muted">{group.items.length}</span>
          </h2>
          <ul className="flex flex-col">
            {group.items.map((item) => (
              <TaskRow key={item.id} item={item} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
