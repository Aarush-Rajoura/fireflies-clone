"use client";

import { useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";

import { useMe } from "@/features/user";

/**
 * Sends a user who has not finished onboarding to the wizard. While /me is
 * loading (or failed) the app renders as usual, so a slow or down backend
 * never blanks the shell; each screen shows its own loading and error states.
 */
export function OnboardingGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: me } = useMe();
  const pending = me !== undefined && me.onboarded_at == null;

  useEffect(() => {
    if (pending) router.replace("/onboarding");
  }, [pending, router]);

  return pending ? null : children;
}
