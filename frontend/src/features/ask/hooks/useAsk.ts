"use client";

import { useCallback, useRef, useState } from "react";

import type { AskCitation } from "@/lib/api";

import { ask, type AskScope } from "../api";
import { describeAskError, type AskFailure } from "../lib/errors";

export type AskMessage = {
  id: number;
  role: "user" | "assistant";
  text: string;
  citations: AskCitation[];
};

export type AskError = AskFailure & { question: string };

/**
 * One ephemeral conversation. Each question is answered on its own (the API
 * is stateless); the history only lives here, so it is gone on reload.
 * `scope` is read at send time, so a hub list that changes mid-chat scopes the
 * next question to what is on screen now.
 */
export function useAsk(scope: AskScope) {
  const [messages, setMessages] = useState<AskMessage[]>([]);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<AskError | null>(null);
  const nextId = useRef(1);
  // Bumped by reset(), so an answer to a cleared conversation is dropped.
  const generation = useRef(0);
  const inFlight = useRef(false);

  const append = useCallback((message: Omit<AskMessage, "id">) => {
    const id = nextId.current++;
    setMessages((prev) => [...prev, { ...message, id }]);
  }, []);

  const run = useCallback(
    async (question: string) => {
      const gen = generation.current;
      inFlight.current = true;
      setPending(true);
      setError(null);
      try {
        const answer = await ask(scope, question);
        if (gen !== generation.current) return;
        append({ role: "assistant", text: answer.answer, citations: answer.citations });
      } catch (cause) {
        if (gen !== generation.current) return;
        setError({ ...describeAskError(cause), question });
      } finally {
        if (gen === generation.current) {
          inFlight.current = false;
          setPending(false);
        }
      }
    },
    [append, scope],
  );

  /** Ignored while blank or while an answer is pending: one question at a time. */
  const send = useCallback(
    (raw: string) => {
      const question = raw.trim();
      if (!question || inFlight.current) return false;
      append({ role: "user", text: question, citations: [] });
      void run(question);
      return true;
    },
    [append, run],
  );

  /** Asks the failed question again without repeating it in the transcript. */
  const retry = useCallback(() => {
    if (!error || inFlight.current) return;
    void run(error.question);
  }, [error, run]);

  const reset = useCallback(() => {
    generation.current++;
    inFlight.current = false;
    setMessages([]);
    setPending(false);
    setError(null);
  }, []);

  return { messages, pending, error, send, retry, reset };
}
