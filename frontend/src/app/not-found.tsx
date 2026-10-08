import Link from "next/link";

import { EmptyState } from "@/components/ui";
import { ThemeProvider } from "@/features/theme";

/** Unmatched URLs anywhere on the site: themed like the app, with a way back. */
export default function NotFound() {
  return (
    <ThemeProvider>
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
    </ThemeProvider>
  );
}
