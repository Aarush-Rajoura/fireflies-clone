"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { scriptedReply } from "./chatScript";
import { CHAT_GREETING, CHAT_QUICK_REPLIES } from "./content";
import { Icon } from "./icons";
import { BrandMark, FredAvatar } from "./marks";

interface Message {
  id: number;
  from: "fred" | "user";
  text: string;
}

const greeting = (): Message[] => CHAT_GREETING.map((text, i) => ({ id: i, from: "fred", text }));

/** Floating "Fred" support widget. Entirely scripted on the client; nothing is sent. */
export function SupportChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>(greeting);
  const [draft, setDraft] = useState("");
  const [showNotice, setShowNotice] = useState(true);
  const nextId = useRef(CHAT_GREETING.length);
  const listRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const bubbleRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  function close() {
    setOpen(false);
    bubbleRef.current?.focus();
  }

  function ask(question: string, answer?: string) {
    const q = question.trim();
    if (!q) return;
    const userMsg: Message = { id: nextId.current++, from: "user", text: q };
    const reply: Message = { id: nextId.current++, from: "fred", text: answer ?? scriptedReply(q) };
    setMessages((m) => [...m, userMsg, reply]);
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    ask(draft);
    setDraft("");
  }

  return (
    <>
      {open && (
        <div
          role="dialog"
          aria-label="Fireflies AI support chat"
          onKeyDown={(e) => e.key === "Escape" && close()}
          className="mk-pop fixed inset-x-3 bottom-24 z-[65] flex max-h-[calc(100dvh-8rem)] flex-col overflow-hidden rounded-2xl bg-[var(--mk-white)] shadow-[0_24px_70px_var(--mk-shadow-strong)] sm:inset-x-auto sm:right-6 sm:w-[400px]"
        >
          <header className="flex items-center gap-3 border-b border-[var(--mk-line)] px-4 py-3.5">
            <button
              type="button"
              onClick={close}
              aria-label="Close chat"
              className="rounded-md p-1.5 text-[var(--mk-body)] hover:bg-[var(--mk-surface)]"
            >
              <Icon name="arrow-left" size={20} />
            </button>
            <FredAvatar size={40} />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold text-[var(--mk-ink)]">Fireflies AI</p>
              <p className="flex items-center gap-1.5 text-[13px] text-[var(--mk-muted)]">
                <span className="h-2 w-2 rounded-full bg-[var(--mk-green)]" /> Always active
              </p>
            </div>
            <button
              type="button"
              onClick={() => setMessages(greeting())}
              aria-label="Restart conversation"
              className="rounded-md p-1.5 text-[var(--mk-body)] hover:bg-[var(--mk-surface)]"
            >
              <Icon name="refresh" size={18} />
            </button>
          </header>

          <div
            ref={listRef}
            aria-live="polite"
            className="min-h-[200px] flex-1 space-y-3 overflow-y-auto px-4 py-4"
          >
            {messages.map((m) =>
              m.from === "fred" ? (
                <div key={m.id} className="flex items-start gap-2.5">
                  <FredAvatar size={28} />
                  <p className="max-w-[85%] rounded-xl rounded-tl-sm bg-[var(--mk-surface-2)] px-3.5 py-2.5 text-[14px] leading-relaxed text-[var(--mk-ink)]">
                    {m.text}
                  </p>
                </div>
              ) : (
                <p
                  key={m.id}
                  className="ml-auto w-fit max-w-[85%] rounded-xl rounded-br-sm bg-[var(--mk-violet)] px-3.5 py-2.5 text-[14px] text-[var(--mk-white)]"
                >
                  {m.text}
                </p>
              ),
            )}
          </div>

          <div className="flex flex-wrap gap-2 px-4 pb-3">
            {CHAT_QUICK_REPLIES.map((qr) => (
              <button
                key={qr.id}
                type="button"
                onClick={() => ask(qr.label, qr.answer)}
                className="rounded-full border border-[var(--mk-violet)] px-3 py-1.5 text-[13px] text-[var(--mk-link)] hover:bg-[var(--mk-violet-tint)]"
              >
                {qr.label}
              </button>
            ))}
          </div>

          <form
            onSubmit={onSubmit}
            className="mx-4 mb-3 flex items-center gap-2 rounded-xl bg-[var(--mk-surface)] px-3 py-2"
          >
            <label htmlFor="mk-chat-input" className="sr-only">
              Write a message
            </label>
            <input
              ref={inputRef}
              id="mk-chat-input"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Write a message"
              autoComplete="off"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-[14px] text-[var(--mk-ink)] placeholder:text-[var(--mk-muted)] focus:outline-none"
            />
            <button
              type="submit"
              aria-label="Send message"
              disabled={!draft.trim()}
              className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--mk-violet)] text-[var(--mk-white)] disabled:opacity-50"
            >
              <Icon name="send" size={16} />
            </button>
          </form>

          <div className="border-t border-[var(--mk-line)] px-4 py-3">
            <p className="flex items-center justify-center gap-1.5 text-[12px] text-[var(--mk-muted)]">
              Powered by <span className="font-semibold text-[var(--mk-ink)]">Fred</span>{" "}
              <BrandMark size={14} />
            </p>
            {showNotice && (
              <div className="relative mt-2.5 flex gap-2 rounded-lg border border-[var(--mk-line)] p-2.5 pr-8 text-[12px] leading-relaxed text-[var(--mk-body)]">
                <Icon name="bulb" size={16} className="mt-0.5 shrink-0" />
                This is a demo assistant with scripted answers. Nothing you type leaves your
                browser.
                <button
                  type="button"
                  onClick={() => setShowNotice(false)}
                  aria-label="Dismiss notice"
                  className="absolute right-1.5 top-1.5 rounded p-1 text-[var(--mk-muted)] hover:text-[var(--mk-ink)]"
                >
                  <Icon name="x" size={14} />
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        ref={bubbleRef}
        type="button"
        onClick={() => (open ? close() : setOpen(true))}
        aria-label={open ? "Close support chat" : "Open support chat"}
        aria-expanded={open}
        className="fixed bottom-5 right-5 z-[65] flex h-14 w-14 items-center justify-center rounded-full bg-[var(--mk-violet)] text-[var(--mk-white)] shadow-[0_12px_32px_var(--mk-glow)] transition-transform hover:scale-105 sm:bottom-6 sm:right-6"
      >
        <Icon name={open ? "x" : "message"} size={26} />
      </button>
    </>
  );
}
