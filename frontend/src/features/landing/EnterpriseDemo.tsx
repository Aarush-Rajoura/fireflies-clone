"use client";

import { useEffect, useState } from "react";
import { DemoForm } from "./DemoForm";
import { Icon } from "./icons";

/** Inline Request Demo card for /enterprise; shows a transient toast on submit. */
export function EnterpriseDemo() {
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    if (!toast) return;
    const t = window.setTimeout(() => setToast(null), 4500);
    return () => window.clearTimeout(t);
  }, [toast]);

  return (
    <div className="rounded-2xl bg-[var(--mk-white)] p-6 shadow-[0_30px_80px_var(--mk-shadow-strong)] sm:p-8">
      <h2 className="mk-display text-[24px] font-medium text-[var(--mk-ink)]">Request a demo</h2>
      <p className="mb-6 mt-1.5 text-[15px] text-[var(--mk-body)]">Tell us a little about your team and we&apos;ll be in touch.</p>
      <DemoForm onSubmitted={(name) => setToast(`Thanks, ${name}! Your demo request is in.`)} />
      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-24 z-[75] flex justify-center px-4">
        {toast && (
          <p className="mk-pop pointer-events-auto flex items-center gap-2.5 rounded-xl bg-[var(--mk-navy)] px-4 py-3 text-[14px] text-[var(--mk-on-dark)] shadow-[0_16px_40px_var(--mk-shadow-strong)]">
            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[var(--mk-green)] text-[var(--mk-navy)]">
              <Icon name="check" size={14} />
            </span>
            {toast}
          </p>
        )}
      </div>
    </div>
  );
}
