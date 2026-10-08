"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui";
import { qk } from "@/lib/api";

import { restartOnboarding, updateProfile } from "../api";

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.me() });
      toast.success("Profile saved.");
    },
  });
}

/**
 * Resets onboarding, then opens the wizard. The wizard lives in another route
 * group with its own query client, so /me is invalidated rather than patched.
 */
export function useRestartOnboarding() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: restartOnboarding,
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: qk.me() });
      router.push("/onboarding");
    },
  });
}
