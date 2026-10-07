"use client";

import { useId, useState, type FormEvent } from "react";
import { COMPANY_SIZES } from "./content";
import { Icon } from "./icons";
import { buttonClass } from "./ui";

const field =
  "mt-1.5 block w-full rounded-md border border-[var(--mk-line)] bg-[var(--mk-white)] px-3 py-2.5 text-[15px] text-[var(--mk-ink)] placeholder:text-[var(--mk-muted)] focus:border-[var(--mk-violet)] focus:outline-none focus:ring-2 focus:ring-[var(--mk-violet-tint)]";

/**
 * Request-a-demo form. Purely presentational: submitting only flips to a success state,
 * nothing is sent to a server.
 */
export function DemoForm({ onSubmitted, autoFocus = false }: { onSubmitted?: (name: string) => void; autoFocus?: boolean }) {
  const id = useId();
  const [sentTo, setSentTo] = useState<string | null>(null);

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const first = name.split(" ")[0] ?? "";
    setSentTo(first || "there");
    onSubmitted?.(first || "there");
  }

  if (sentTo) {
    return (
      <div role="status" className="mk-pop flex flex-col items-center py-6 text-center">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mk-green-tint)] text-[var(--mk-green-ink)]">
          <Icon name="check" size={26} />
        </span>
        <p className="mk-display mt-4 text-xl font-medium text-[var(--mk-ink)]">Thanks, {sentTo}!</p>
        <p className="mt-2 max-w-xs text-sm text-[var(--mk-body)]">
          Our team will reach out within one business day to find a time that works.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor={`${id}-name`} className="text-sm font-medium text-[var(--mk-ink)]">
          Full name
        </label>
        <input
          id={`${id}-name`}
          name="name"
          required
          autoComplete="name"
          autoFocus={autoFocus}
          placeholder="Jordan Lee"
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${id}-email`} className="text-sm font-medium text-[var(--mk-ink)]">
          Work email
        </label>
        <input
          id={`${id}-email`}
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="jordan@company.com"
          className={field}
        />
      </div>
      <div>
        <label htmlFor={`${id}-size`} className="text-sm font-medium text-[var(--mk-ink)]">
          Company size
        </label>
        <select id={`${id}-size`} name="size" required defaultValue="" className={field}>
          <option value="" disabled>
            Select company size
          </option>
          {COMPANY_SIZES.map((s) => (
            <option key={s} value={s}>
              {s} employees
            </option>
          ))}
        </select>
      </div>
      <button type="submit" className={buttonClass("primary", "md", "w-full")}>
        Request Demo
        <Icon name="arrow-right" size={18} />
      </button>
      <p className="text-center text-xs text-[var(--mk-muted)]">Demo only: nothing is sent from this form.</p>
    </form>
  );
}
