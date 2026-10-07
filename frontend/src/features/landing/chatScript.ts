// Scripted answers for the demo support chat. Purely client-side; nothing is sent anywhere.
import { CHAT_FALLBACK, CHAT_QUICK_REPLIES } from "./content";

const KEYWORDS: Record<string, string[]> = {
  pricing: ["price", "pricing", "cost", "plan", "pay", "free", "$"],
  integrations: ["integrat", "connect", "crm", "calendar", "app", "slack", "zoom"],
  security: ["secur", "privacy", "gdpr", "soc", "encrypt", "data"],
};

/** Pick the scripted answer for a free-text question by simple keyword matching. */
export function scriptedReply(question: string): string {
  const q = question.toLowerCase();
  for (const reply of CHAT_QUICK_REPLIES) {
    const words = KEYWORDS[reply.id] ?? [];
    if (words.some((w) => q.includes(w))) return reply.answer;
  }
  return CHAT_FALLBACK;
}
