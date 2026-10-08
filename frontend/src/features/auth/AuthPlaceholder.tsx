import Link from "next/link";

import { SoonBadge, buttonVariants } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

const COPY = {
  login: { title: "Log in to Fireflies", cta: "Continue to the demo" },
  signup: { title: "Create your Fireflies account", cta: "Try the demo" },
} as const;

/** Stand-in auth screen: there are no accounts yet, so it leads straight into the demo workspace. */
export function AuthPlaceholder({ mode }: { mode: keyof typeof COPY }) {
  const { title, cta } = COPY[mode];
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="flex w-full max-w-modal-sm flex-col items-center gap-4 rounded-card border border-subtle bg-surface-1 p-8 text-center">
        <SoonBadge />
        <h1 className="text-h2 text-strong">{title}</h1>
        <p className="text-body text-secondary">
          Sign-in is coming soon. You can explore the app with a demo account right now.
        </p>
        <Link
          href="/meetings"
          className={cn(
            "inline-flex h-btn-md items-center rounded-control px-4 text-body-strong",
            buttonVariants.primary,
          )}
        >
          {cta}
        </Link>
        <Link href="/" className="text-meta text-muted hover:text-primary">
          Back to home
        </Link>
      </div>
    </main>
  );
}
