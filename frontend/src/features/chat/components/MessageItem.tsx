import { ArrowUpRight, Sparkles } from "lucide-react";
import Link from "next/link";

import { formatTimestamp } from "@/components/ui";
import type { ChatCitation, ChatMessage } from "@/lib/api";
import { aiProviderLabel } from "@/lib/utils/ai-provider";

import { chatCitationHref } from "../lib/history";
import { RichText } from "./RichText";

/** One turn: the user's question as a bubble, or Fred's reply with its numbered sources. */
export function MessageItem({ message }: { message: ChatMessage }) {
  if (message.role === "user") {
    return (
      <p className="max-w-[85%] self-end whitespace-pre-wrap break-words rounded-card bg-surface-3 px-4 py-2.5 text-body text-primary">
        {message.content}
      </p>
    );
  }
  const answeredBy = aiProviderLabel(message.provider);
  return (
    <article aria-label="AskFred's answer" className="flex gap-3">
      <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-accent">
        <Sparkles aria-hidden strokeWidth={1.75} className="size-4" />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-3">
        <RichText source={message.content} citations={message.citations} />
        {message.citations.length > 0 && <Sources citations={message.citations} />}
        {answeredBy && <p className="text-meta text-muted">{answeredBy}</p>}
      </div>
    </article>
  );
}

function Sources({ citations }: { citations: ChatCitation[] }) {
  return (
    <section aria-label="Sources" className="flex flex-col gap-1.5">
      <h4 className="text-label text-muted">Sources</h4>
      <ol className="flex flex-wrap gap-1.5">
        {citations.map((c, i) => (
          <li key={c.id} className="max-w-full">
            <Link
              href={chatCitationHref(c)}
              title={c.quote}
              aria-label={`Source ${i + 1}: ${c.meeting_title}${c.start_ms != null ? ` at ${formatTimestamp(c.start_ms)}` : ""}`}
              className="group inline-flex max-w-[320px] items-center gap-1.5 rounded-item border border-subtle bg-surface-2 px-2 py-1 text-meta text-secondary outline-none transition-colors duration-fast hover:border-strong hover:text-primary focus-visible:shadow-focus"
            >
              <span className="tnum shrink-0 text-muted">{i + 1}</span>
              <span className="min-w-0 truncate">{c.meeting_title}</span>
              {c.start_ms != null && (
                <span className="tnum shrink-0 text-accent">{formatTimestamp(c.start_ms)}</span>
              )}
              <ArrowUpRight
                aria-hidden
                strokeWidth={1.75}
                className="size-3.5 shrink-0 text-muted group-hover:text-primary"
              />
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
