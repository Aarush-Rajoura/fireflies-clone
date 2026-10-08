import Link from "next/link";

import { AppProviders, EmptyState } from "@/components/ui";

/** Unmatched URLs anywhere on the site: themed like the app, with a way back. */
export default function NotFound() {
  return (
    <AppProviders>
      <EmptyState
        title="Page not found"
        description="This page doesn't exist or has moved."
        action={
          <Link href="/" className="text-body-strong text-accent hover:underline">
            Back to home
          </Link>
        }
        className="py-32"
      />
    </AppProviders>
  );
}
