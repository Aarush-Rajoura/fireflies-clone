import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { env } from "@/lib/env";

import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "UI kit · dev", robots: { index: false } };

/** Dev-only primitives gallery. Production returns 404 unless NEXT_PUBLIC_SHOW_DEV_PAGES=1. */
export default function UiGalleryPage() {
  if (!env.showDevPages) notFound();
  return (
    <main className="grid min-h-screen grid-cols-1 xl:grid-cols-2">
      <section data-theme="dark" aria-label="Dark theme" className="bg-surface-0 text-primary">
        <Gallery theme="Dark" />
      </section>
      <section data-theme="light" aria-label="Light theme" className="bg-surface-0 text-primary">
        <Gallery theme="Light" />
      </section>
    </main>
  );
}
