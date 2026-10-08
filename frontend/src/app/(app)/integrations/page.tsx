import { Suspense } from "react";

import { IntegrationsView } from "@/features/integrations";

export const metadata = { title: "Integrations · Fireflies.ai Clone" };

// The view reads tab/category/q from the URL, which needs a Suspense boundary to prerender.
export default function IntegrationsPage() {
  return (
    <Suspense>
      <IntegrationsView />
    </Suspense>
  );
}
