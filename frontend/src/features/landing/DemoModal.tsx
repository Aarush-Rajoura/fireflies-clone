"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { DemoForm } from "./DemoForm";
import { Icon } from "./icons";
import { buttonClass, type ButtonSize, type ButtonVariant } from "./ui";
import { Pressable } from "@/components/ui";

interface DemoContextValue {
  open: () => void;
}

const DemoContext = createContext<DemoContextValue | null>(null);

export function useDemoModal() {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error("useDemoModal must be used inside <DemoProvider>");
  return ctx;
}

/** Provides a single Request Demo modal for the whole marketing layout. */
export function DemoProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Remember who opened the modal so focus can return there on close.
  const opener = useRef<HTMLElement | null>(null);

  const open = useCallback(() => {
    opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setIsOpen(true);
  }, []);
  const close = useCallback(() => {
    setIsOpen(false);
    opener.current?.focus();
  }, []);
  const value = useMemo(() => ({ open }), [open]);

  return (
    <DemoContext.Provider value={value}>
      {children}
      {isOpen && <DemoDialog onClose={close} />}
    </DemoContext.Provider>
  );
}

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

function DemoDialog({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
      // Minimal focus trap: keep Tab cycling inside the dialog, and pull stray focus back in.
      if (e.key === "Tab" && panel.current) {
        const nodes = panel.current.querySelectorAll<HTMLElement>(FOCUSABLE);
        const first = nodes[0];
        const last = nodes[nodes.length - 1];
        const active = document.activeElement as HTMLElement | null;
        // Outside the panel, or on a non-tabbable node inside it (e.g. the success message).
        if (!active || !panel.current.contains(active) || !Array.from(nodes).includes(active)) {
          e.preventDefault();
          (e.shiftKey ? last : first)?.focus();
        } else if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    }
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-[var(--mk-scrim)] backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="demo-dialog-title"
        className="mk-pop relative w-full max-w-md rounded-2xl bg-[var(--mk-white)] p-6 shadow-[0_24px_64px_var(--mk-shadow-strong)] sm:p-8"
      >
        <Pressable
          bare
          type="button"
          onClick={onClose}
          aria-label="Close dialog"
          className="absolute right-4 top-4 rounded-md p-1.5 text-[var(--mk-muted)] hover:bg-[var(--mk-surface-2)] hover:text-[var(--mk-ink)]"
        >
          <Icon name="x" size={20} />
        </Pressable>
        <h2 id="demo-dialog-title" className="mk-display text-2xl font-medium text-[var(--mk-ink)]">
          Request a demo
        </h2>
        <p className="mb-6 mt-1.5 text-sm text-[var(--mk-body)]">
          See how Fireflies fits your team&apos;s workflow in a 20-minute walkthrough.
        </p>
        <DemoForm autoFocus />
      </div>
    </div>
  );
}

/** Any "Request Demo" button on the site: opens the shared modal. */
export function DemoButton({
  variant = "secondary",
  size = "md",
  className = "",
  children = "Request Demo",
  onOpen,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children?: ReactNode;
  onOpen?: () => void;
}) {
  const { open } = useDemoModal();
  return (
    <Pressable
      bare
      type="button"
      aria-haspopup="dialog"
      onClick={() => {
        onOpen?.();
        open();
      }}
      className={buttonClass(variant, size, className)}
    >
      {children}
    </Pressable>
  );
}
