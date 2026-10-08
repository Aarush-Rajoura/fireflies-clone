import { Suspense } from "react";

import { AnalyticsView } from "@/features/analytics";

export const metadata = { title: "Analytics · Fireflies.ai Clone" };

export default function AnalyticsPage() {
  // useSearchParams in the view needs a Suspense boundary during prerender.
  return (
    <Suspense>
      <AnalyticsView />
    </Suspense>
  );
}
