import { useId, type ReactNode } from "react";

/** Heading + body block shared by the five summary sections. */
export function SummarySection({ label, children }: { label: string; children: ReactNode }) {
  const id = useId();
  return (
    <section aria-labelledby={id} className="flex flex-col gap-2.5">
      <h3 id={id} className="text-h3 text-strong">
        {label}
      </h3>
      {children}
    </section>
  );
}
