"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

import { usePortalContainer } from "./theme-root";

import { IconButton } from "./icon-button";

export type ModalSize = "sm" | "md" | "lg";

const widths: Record<ModalSize, string> = {
  sm: "max-w-modal-sm",
  md: "max-w-modal-md",
  lg: "max-w-modal-lg",
};

export type ModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  /** Prevents closing by overlay click / Escape, e.g. while a request is in flight. */
  dismissible?: boolean;
};

/** Dialog with Radix focus trap, scroll lock and focus return. Sizes 440/560/720. */
export function Modal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  size = "md",
  dismissible = true,
}: ModalProps) {
  const container = usePortalContainer();
  const block = (e: Event) => {
    if (!dismissible) e.preventDefault();
  };
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal container={container}>
        <Dialog.Overlay className="fixed inset-0 z-modal bg-scrim" />
        <Dialog.Content
          onEscapeKeyDown={block}
          onPointerDownOutside={block}
          className={cn(
            "fixed left-1/2 top-1/2 z-modal flex max-h-[85vh] w-[calc(100vw-32px)] -translate-x-1/2 -translate-y-1/2 flex-col rounded-card border border-subtle bg-surface-1 shadow-overlay animate-fade-in",
            widths[size],
          )}
        >
          <div className="flex items-start justify-between gap-4 px-5 pb-2 pt-5">
            <div className="flex flex-col gap-1">
              <Dialog.Title className="text-h3 text-strong">{title}</Dialog.Title>
              {description ? (
                <Dialog.Description className="text-body text-secondary">
                  {description}
                </Dialog.Description>
              ) : (
                <Dialog.Description className="sr-only">{title}</Dialog.Description>
              )}
            </div>
            {dismissible && (
              <Dialog.Close asChild>
                <IconButton
                  label="Close"
                  size="sm"
                  icon={<X strokeWidth={1.75} />}
                  tooltip={false}
                />
              </Dialog.Close>
            )}
          </div>
          {children && <div className="min-h-0 flex-1 overflow-y-auto px-5 py-3">{children}</div>}
          {footer && <div className="flex justify-end gap-2 px-5 pb-5 pt-3">{footer}</div>}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
