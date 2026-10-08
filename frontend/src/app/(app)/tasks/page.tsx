import { Suspense } from "react";

import { TasksView } from "@/features/tasks";

export const metadata = { title: "Tasks · Fireflies.ai Clone" };

/* The view reads its scope and filters from the URL, which only exists in the browser; Suspense marks that boundary. */
export default function TasksPage() {
  return (
    <Suspense>
      <TasksView />
    </Suspense>
  );
}
