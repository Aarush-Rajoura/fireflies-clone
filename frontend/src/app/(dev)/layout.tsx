import type { ReactNode } from "react";

import { AppProviders } from "@/components/ui";

/** Dev pages get the same themed scope as the app, without the app shell. */
export default function DevLayout({ children }: { children: ReactNode }) {
  return <AppProviders>{children}</AppProviders>;
}
