"use client";

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";

import { toast } from "@/components/ui";
import { qk, type Me } from "@/lib/api";

import { restartOnboarding, updateProfile } from "../api";

export function useUpdateProfile() {
  const client = useQueryClient();
  return useMutation({
    mutationFn: updateProfile,
    onSuccess: (me) => {
      client.setQueryData<Me>(qk.me(), me);
      toast.success("Profile saved.");
    },
  });
}

/** Resets onboarding, then opens the wizard (the app's gate would send the user there anyway). */
export function useRestartOnboarding() {
  const client = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: restartOnboarding,
    onSuccess: () => {
      client.setQueryData<Me>(qk.me(), (me) => (me ? { ...me, onboarded_at: null } : me));
      router.push("/onboarding");
    },
  });
}
