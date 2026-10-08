import Link from "next/link";

import { EmptyState } from "@/components/ui";

export default function AppNotFound() {
  return (
    <EmptyState
      title="Page not found"
      description="This page doesn't exist or has moved."
      action={
        <Link href="/meetings" className="text-body-strong text-accent hover:underline">
          Go to Meetings
        </Link>
      }
      className="py-24"
    />
  );
}
