import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ThemeRoot } from "@/components/ui";
import { env } from "@/lib/env";

import { Gallery } from "./gallery";

export const metadata: Metadata = { title: "UI kit · dev", robots: { index: false } };

/** Dev-only primitives gallery. Production returns 404 unless NEXT_PUBLIC_SHOW_DEV_PAGES=1. */
export default function UiGalleryPage() {
  if (!env.showDevPages) notFound();
  return (
    <main className="grid min-h-screen grid-cols-1 xl:grid-cols-2">
      {/* Each column is its own ThemeRoot so its overlays portal into the matching theme. */}
      <ThemeRoot defaultTheme="dark">
        <section aria-label="Dark theme">
          <Gallery theme="Dark" />
        </section>
      </ThemeRoot>
      <ThemeRoot defaultTheme="light">
        <section aria-label="Light theme">
          <Gallery theme="Light" />
        </section>
      </ThemeRoot>
    </main>
  );
}
