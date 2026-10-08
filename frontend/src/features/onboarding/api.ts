import { unwrap, type OnboardingInput, type OnboardingResult } from "@/lib/api";
import { api } from "@/lib/api/client";

export function saveOnboarding(body: OnboardingInput): Promise<OnboardingResult> {
  return unwrap(api.PUT("/api/v1/me/onboarding", { body }));
}
