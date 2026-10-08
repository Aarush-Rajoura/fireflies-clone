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

/** Small accent link-button showing a timestamp; clicking jumps the player there. */
export function TimestampButton({
  label,
  onClick,
  title,
}: {
  label: string;
  onClick: () => void;
  title: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={`Jump to ${title} at ${label}`}
      className="tnum shrink-0 rounded-tag text-body-strong text-accent hover:underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2"
    >
      {label}
    </button>
  );
}
