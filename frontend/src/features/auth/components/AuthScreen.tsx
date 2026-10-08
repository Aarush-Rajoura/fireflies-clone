import Link from "next/link";

import { BrandMark } from "@/components/ui";

import type { AuthMode } from "../lib/credentials";

import { AuthForm } from "./AuthForm";
import { AuthShowcase } from "./AuthShowcase";

/** Split sign-in layout: the form on the left, a product visual on the right (hidden on small screens). */
export function AuthScreen({ mode }: { mode: AuthMode }) {
  return (
    <main className="grid min-h-screen bg-surface-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
      <section className="flex flex-col px-6 py-6 sm:px-10">
        <Link href="/" aria-label="Fireflies home" className="self-start rounded-control">
          <BrandMark withWordmark />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <AuthForm mode={mode} />
        </div>
      </section>
      <aside
        aria-label="About Fireflies"
        className="hidden border-l border-subtle bg-surface-sunken lg:block"
      >
        <AuthShowcase />
      </aside>
    </main>
  );
}
