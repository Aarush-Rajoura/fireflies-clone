/**
 * Plain words for the backend's provider label, so users always know whether a
 * real model answered or the offline demo AI stepped in.
 */
export function aiProviderLabel(provider: string | null | undefined): string | null {
  if (!provider) return null;
  if (provider === "gemini") return "Answered by Gemini";
  if (provider.includes("fallback")) return "Demo AI (Gemini unavailable)";
  if (provider === "mock") return "Demo AI (offline)";
  return `Answered by ${provider}`;
}
