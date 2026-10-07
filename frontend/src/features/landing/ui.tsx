// Shared marketing primitives: buttons and accent headings.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { Icon } from "./icons";

export type ButtonVariant = "primary" | "secondary" | "white" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-[var(--mk-violet)] text-[var(--mk-white)] hover:bg-[var(--mk-violet-hover)]",
  secondary:
    "bg-[var(--mk-secondary)] text-[var(--mk-white)] hover:bg-[var(--mk-secondary-hover)] border border-[var(--mk-white-14)]",
  white: "bg-[var(--mk-white)] text-[var(--mk-ink)] hover:bg-[var(--mk-surface-2)]",
  ghost: "text-[var(--mk-ink)] border border-[var(--mk-line)] hover:bg-[var(--mk-surface)]",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-[15px]",
  lg: "h-[52px] px-6 text-[17px]",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-md font-medium whitespace-nowrap transition-colors duration-150 ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

interface ButtonLinkProps extends Omit<ComponentProps<typeof Link>, "className"> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  arrow?: boolean;
  className?: string;
}

export function ButtonLink({ variant, size, arrow, className, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClass(variant, size, className)} {...rest}>
      {children}
      {arrow && <Icon name="arrow-right" size={18} />}
    </Link>
  );
}

/**
 * Heading where words wrapped in *asterisks* get the violet accent, and "\n" forces a line break.
 * e.g. "High Quality Meeting\n*Transcription* & *Recording*".
 */
export function AccentHeading({
  text,
  dark = false,
  as: Tag = "h2",
  className = "",
  id,
}: {
  id?: string;
  text: string;
  dark?: boolean;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  const accent = dark ? "text-[var(--mk-violet-soft)]" : "text-[var(--mk-violet)]";
  const lines = text.split("\n");
  return (
    <Tag
      id={id}
      className={`mk-display font-medium leading-[1.15] ${
        dark ? "text-[var(--mk-on-dark)]" : "text-[var(--mk-ink)]"
      } ${className}`}
    >
      {lines.map((line, li) => (
        <span key={li} className="block">
          {line.split("*").map((part, pi) =>
            pi % 2 === 1 ? (
              <span key={pi} className={accent}>
                {part}
              </span>
            ) : (
              <span key={pi}>{part}</span>
            ),
          )}
        </span>
      ))}
    </Tag>
  );
}

export function Container({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`mx-auto w-full max-w-[1200px] px-4 sm:px-6 lg:px-8 ${className}`}>{children}</div>;
}
