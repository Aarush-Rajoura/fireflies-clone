"use client";

import { useState } from "react";

import { Skeleton } from "@/components/ui";
import { useMe } from "@/features/user";

import { firstName } from "../lib/format";

import { DemoThumbnail, DemoVideoModal } from "./DemoVideo";

/** The warm brown "Welcome Aboard, {name}!" card with the product-demo thumbnail. */
export function WelcomeBanner() {
  const { data: me, isLoading } = useMe();
  const [demoOpen, setDemoOpen] = useState(false);
  const name = firstName(me?.name);
  return (
    <section
      aria-labelledby="welcome-heading"
      className="flex flex-col items-center gap-8 rounded-[20px] border border-welcome-border bg-gradient-to-br from-welcome-from to-welcome-to px-8 py-10 sm:flex-row sm:justify-between md:px-[140px] md:py-11"
    >
      <div className="flex min-w-0 max-w-[420px] flex-col gap-4">
        {isLoading ? (
          <Skeleton className="h-8 w-64" />
        ) : (
          <h2 id="welcome-heading" className="text-[24px] font-semibold leading-8 text-strong">
            {`Welcome Aboard${name ? `, ${name}` : ""}!`}
          </h2>
        )}
        <p className="text-[16px] leading-6 text-secondary">
          Fireflies is now ready to automate your meetings and streamline your workflows.
        </p>
      </div>
      <DemoThumbnail onPlay={() => setDemoOpen(true)} />
      <DemoVideoModal open={demoOpen} onOpenChange={setDemoOpen} />
    </section>
  );
}
