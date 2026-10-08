import {
  forwardRef,
  type InputHTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
} from "react";

import { cn } from "@/lib/utils/cn";

/** Shared field chrome so Input, Textarea, SearchInput and Select line up. */
export const fieldClasses =
  "w-full rounded-control border border-control bg-surface-2 px-3 text-body text-primary transition-colors duration-fast placeholder:text-muted hover:border-strong focus-visible:border-accent-border disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-danger";

export type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  invalid?: boolean;
  leadingIcon?: ReactNode;
  trailing?: ReactNode;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, invalid, leadingIcon, trailing, ...rest },
  ref,
) {
  const input = (
    <input
      ref={ref}
      aria-invalid={invalid || undefined}
      className={cn(fieldClasses, "h-input", leadingIcon && "pl-9", trailing && "pr-16", className)}
      {...rest}
    />
  );
  if (!leadingIcon && !trailing) return input;
  return (
    <div className="relative w-full">
      {leadingIcon && (
        <span className="pointer-events-none absolute left-3 top-1/2 flex -translate-y-1/2 text-muted [&_svg]:size-4">
          {leadingIcon}
        </span>
      )}
      {input}
      {trailing && (
        <span className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1">
          {trailing}
        </span>
      )}
    </div>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  invalid?: boolean;
  /**
   * No field chrome or focus ring: for a textarea inside a container that is
   * itself the field and shows focus (e.g. a chat composer card).
   */
  bare?: boolean;
};

const bareClasses =
  "w-full resize-none bg-transparent text-body text-primary outline-none placeholder:text-muted focus-visible:shadow-none disabled:cursor-not-allowed disabled:opacity-50";

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { className, invalid, bare = false, rows = 3, ...rest },
  ref,
) {
  if (bare) {
    return (
      <textarea
        ref={ref}
        rows={rows}
        aria-invalid={invalid || undefined}
        className={cn(bareClasses, className)}
        {...rest}
      />
    );
  }
  return (
    <textarea
      ref={ref}
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(fieldClasses, "resize-y py-2", className)}
      {...rest}
    />
  );
});

export function Field({
  label,
  htmlFor,
  hint,
  error,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-label text-secondary">
        {label}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-caption text-danger-strong">
          {error}
        </p>
      ) : hint ? (
        <p className="text-caption text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
