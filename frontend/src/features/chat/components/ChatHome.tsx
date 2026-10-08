"use client";

import {
  Calendar,
  CheckCheck,
  Layers,
  ListPlus,
  WandSparkles,
  type LucideIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";

import { Button, Skeleton } from "@/components/ui";
import { useMe } from "@/features/user";
import type { ChatMessageCreate, ChatSkillId } from "@/lib/api";

import { Composer } from "./Composer";

type Prompt = { label: string; icon: LucideIcon } & ({ skill: ChatSkillId } | { href: string });

/** In the product's order; each runs its skill directly rather than relying on wording. */
export const SUGGESTED_PROMPTS: readonly Prompt[] = [
  { label: "List my action items & todos for this week", icon: CheckCheck, skill: "action-items" },
  { label: "Summarize my last meeting", icon: ListPlus, skill: "summarize" },
  { label: "Prepare me for the upcoming meeting", icon: WandSparkles, skill: "prepare" },
  {
    label: "Connect Gmail, Notion, and 30+ sources for richer insights.",
    icon: Layers,
    href: "/integrations",
  },
  { label: "Prepare weekly digest, based on my meetings", icon: Calendar, skill: "digest" },
];

export type ChatHomeProps = {
  onSend: (body: ChatMessageCreate) => boolean;
  pending: boolean;
};

/** A new chat: the greeting, the composer and the suggested prompts. */
export function ChatHome({ onSend, pending }: ChatHomeProps) {
  const me = useMe();
  const router = useRouter();

  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <div className="mx-auto flex w-full max-w-[770px] flex-1 flex-col px-6 pt-[88px]">
        <h2 className="pb-12 text-[26px] font-semibold leading-9 text-strong">
          {me.data ? (
            `Hi ${me.data.name}, how can I help today?`
          ) : (
            <Skeleton className="h-9 w-96" />
          )}
        </h2>
        <Composer onSubmit={onSend} pending={pending} autoFocus />
        <ul aria-label="Suggested prompts" className="flex flex-col gap-2 pt-10">
          {SUGGESTED_PROMPTS.map((prompt) => {
            const Icon = prompt.icon;
            return (
              <li key={prompt.label}>
                <Button
                  variant="ghost"
                  disabled={pending}
                  leadingIcon={<Icon strokeWidth={1.75} className="text-muted" />}
                  onClick={() =>
                    "href" in prompt
                      ? router.push(prompt.href)
                      : onSend({ question: prompt.label, skill: prompt.skill })
                  }
                  className="min-h-12 w-full justify-start gap-3 rounded-item bg-surface-2 px-4 font-normal text-primary hover:bg-surface-hover [&>span]:gap-3"
                >
                  {prompt.label}
                </Button>
              </li>
            );
          })}
        </ul>
        <p className="mt-auto pb-6 pt-16 text-center text-meta text-muted">Consumes AI credits</p>
      </div>
    </div>
  );
}
