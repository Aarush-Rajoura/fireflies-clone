import Link from "next/link";
import { Fragment } from "react";

import type { ChatCitation } from "@/lib/api";

import { chatCitationHref } from "../lib/history";
import { parseBlocks, type Inline } from "../lib/markdown";

/**
 * Renders a markdown-lite reply as React elements (never as HTML), turning
 * `[n]` markers into links to the n-th citation's moment in its meeting.
 */
export function RichText({ source, citations }: { source: string; citations: ChatCitation[] }) {
  return (
    <div className="flex flex-col gap-3 break-words text-body text-primary">
      {parseBlocks(source).map((block, i) => {
        if (block.kind === "heading") {
          const Tag = block.level === 2 ? "h3" : "h4";
          return (
            <Tag
              key={i}
              className={block.level === 2 ? "text-h3 text-strong" : "text-body-strong text-strong"}
            >
              <Inlines inlines={block.inlines} citations={citations} />
            </Tag>
          );
        }
        if (block.kind === "list") {
          return (
            <ul key={i} className="flex list-disc flex-col gap-1.5 pl-5 marker:text-muted">
              {block.items.map((item, j) => (
                <li key={j}>
                  <Inlines inlines={item} citations={citations} />
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i} className="whitespace-pre-wrap">
            <Inlines inlines={block.inlines} citations={citations} />
          </p>
        );
      })}
    </div>
  );
}

function Inlines({ inlines, citations }: { inlines: Inline[]; citations: ChatCitation[] }) {
  return (
    <>
      {inlines.map((part, i) => {
        if (part.kind === "bold")
          return (
            <strong key={i} className="font-semibold text-strong">
              {part.text}
            </strong>
          );
        if (part.kind === "text") return <Fragment key={i}>{part.text}</Fragment>;
        const citation = citations[part.n - 1];
        // A marker with no matching source is shown as plain text rather than a dead link.
        if (!citation) return <Fragment key={i}>[{part.n}]</Fragment>;
        return (
          <Link
            key={i}
            href={chatCitationHref(citation)}
            title={`${citation.meeting_title}: ${citation.quote}`}
            aria-label={`Source ${part.n}: ${citation.meeting_title}`}
            className="tnum mx-0.5 inline-flex h-4 min-w-4 -translate-y-0.5 items-center justify-center rounded-tag bg-accent-subtle px-1 align-middle text-micro text-accent outline-none hover:bg-accent hover:text-on-accent focus-visible:shadow-focus"
          >
            {part.n}
          </Link>
        );
      })}
    </>
  );
}
