import { unwrap, type Me, type ProfileUpdate } from "@/lib/api";
import { api } from "@/lib/api/client";

export function updateProfile(body: ProfileUpdate): Promise<Me> {
  return unwrap(api.PATCH("/api/v1/me", { body }));
}

/** Clears `onboarded_at`; earlier answers are kept as the wizard's starting point. */
export function restartOnboarding(): Promise<void> {
  return unwrap(api.DELETE("/api/v1/me/onboarding")) as Promise<void>;
}
