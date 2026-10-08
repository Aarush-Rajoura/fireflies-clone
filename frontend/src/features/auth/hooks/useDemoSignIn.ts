"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { meQuery } from "@/features/user";

import type { AuthMode } from "../lib/credentials";

/**
 * "Signs in" as the seeded demo user; there is no real authentication.
 * Sign-up always starts onboarding; log-in goes to Meetings unless the demo
 * user has not finished onboarding yet.
 */
export function useDemoSignIn() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: async (mode: AuthMode): Promise<string> => {
      if (mode === "signup") return "/onboarding";
      // staleTime 0: onboarding may have been restarted since /me was cached.
      const me = await client.fetchQuery({ ...meQuery, staleTime: 0 });
      return me.onboarded_at ? "/meetings" : "/onboarding";
    },
    onSuccess: (destination) => router.push(destination),
  });
}
