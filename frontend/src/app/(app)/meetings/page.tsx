import { Suspense } from "react";

import { MeetingsHub } from "@/features/meetings";

export const metadata = { title: "Meetings · Fireflies.ai Clone" };

/* The hub reads its filters from the URL, which only exists in the browser; Suspense marks that boundary. */
export default function MeetingsPage() {
  return (
    <Suspense>
      <MeetingsHub />
    </Suspense>
  );
}
