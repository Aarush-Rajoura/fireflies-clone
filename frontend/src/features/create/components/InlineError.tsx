import { AlertCircle } from "lucide-react";

/** An error the user can act on in place, kept next to the input it is about. */
export function InlineError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-item border border-danger bg-danger-subtle px-3 py-2 text-meta text-danger-strong"
    >
      <AlertCircle className="mt-px size-4 shrink-0" strokeWidth={1.75} />
      {message}
    </p>
  );
}
