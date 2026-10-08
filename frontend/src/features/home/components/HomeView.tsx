"use client";

import { usePathname, useRouter } from "next/navigation";
import { Suspense, useState } from "react";

import { SkeletonRow } from "@/components/ui";

import { CaptureModal } from "./CaptureModal";
import { HomeTabs } from "./HomeTabs";
import { QuickStartCards } from "./QuickStartCards";
import { ScheduleModal } from "./ScheduleModal";
import { UploadSoonModal } from "./UploadSoonModal";
import { WelcomeBanner } from "./WelcomeBanner";

type Flow = "schedule" | "upload" | "capture" | null;

/** /home: welcome banner, Quick Start, then Recent | Upcoming | AI Feed. */
export function HomeView() {
  const [flow, setFlow] = useState<Flow>(null);
  const router = useRouter();
  const pathname = usePathname() ?? "/home";
  const close = (open: boolean) => !open && setFlow(null);

  return (
    // Cool and warm washes at the top corners, as in the reference.
    <div className="min-h-full bg-[radial-gradient(ellipse_70%_55%_at_0%_0%,var(--ff-glow-cool),transparent),radial-gradient(ellipse_45%_35%_at_100%_0%,var(--ff-glow-warm),transparent)]">
      <div className="mx-auto flex w-full max-w-[1056px] flex-col gap-14 px-4 pb-16 pt-10 sm:px-6 md:pt-20">
        <WelcomeBanner />
        <QuickStartCards
          onSchedule={() => setFlow("schedule")}
          onUpload={() => setFlow("upload")}
          onCapture={() => setFlow("capture")}
        />
        {/* useSearchParams needs a Suspense boundary so the route can still prerender. */}
        <Suspense fallback={<SkeletonRow />}>
          <HomeTabs onSchedule={() => setFlow("schedule")} />
        </Suspense>
      </div>
      <ScheduleModal
        open={flow === "schedule"}
        onOpenChange={close}
        onScheduled={() => router.replace(`${pathname}?tab=upcoming`, { scroll: false })}
      />
      <CaptureModal open={flow === "capture"} onOpenChange={close} />
      <UploadSoonModal open={flow === "upload"} onOpenChange={close} />
    </div>
  );
}
