"use client";

import { useState, type DragEvent, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export type DropzoneProps = {
  /** Passed to the file input, e.g. ".txt,.vtt". The caller still validates: drops bypass it. */
  accept?: string;
  onFiles: (files: File[]) => void;
  /** Accessible name of the hidden file input. */
  label: string;
  disabled?: boolean;
  children: ReactNode;
  className?: string;
};

/**
 * Drag-and-drop area that is also a click/keyboard file picker. It is a
 * <label> around a visually hidden input, so the native picker, focus and
 * screen-reader semantics come for free.
 */
export function Dropzone({ accept, onFiles, label, disabled, children, className }: DropzoneProps) {
  const [dragging, setDragging] = useState(false);

  const over = (e: DragEvent) => {
    e.preventDefault();
    if (!disabled) setDragging(true);
  };
  const drop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (disabled) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length) onFiles(files);
  };

  return (
    <label
      onDragEnter={over}
      onDragOver={over}
      onDragLeave={() => setDragging(false)}
      onDrop={drop}
      data-dragging={dragging || undefined}
      className={cn(
        "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-card border border-dashed border-strong bg-surface-sunken px-6 py-10 text-center transition-colors duration-fast hover:border-accent-border focus-within:border-accent-border",
        dragging && "border-accent-border bg-accent-subtle",
        disabled && "pointer-events-none opacity-50",
        className,
      )}
    >
      <input
        type="file"
        aria-label={label}
        accept={accept}
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          // Reset so picking the same file again (after an error) still fires onChange.
          e.target.value = "";
          if (files.length) onFiles(files);
        }}
      />
      {children}
    </label>
  );
}
