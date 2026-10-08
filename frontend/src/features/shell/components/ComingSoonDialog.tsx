"use client";

import { useState, type ReactNode } from "react";

import { Button, Modal, SoonBadge } from "@/components/ui";

export type SoonContent = { title: string; message: string; body?: ReactNode };

/** One reusable "visible but not built yet" dialog, so no control is a dead end. */
export function ComingSoonDialog({
  content,
  onClose,
}: {
  content: SoonContent | null;
  onClose: () => void;
}) {
  return (
    <Modal
      open={content !== null}
      onOpenChange={(open) => !open && onClose()}
      title={content?.title ?? ""}
      size="sm"
      footer={
        <Button variant="primary" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="flex flex-col items-start gap-3">
        <SoonBadge />
        <p className="text-body text-secondary">{content?.message}</p>
        {content?.body}
      </div>
    </Modal>
  );
}

/** Local state + dialog element for a component that has several Coming Soon entry points. */
export function useComingSoon() {
  const [content, setContent] = useState<SoonContent | null>(null);
  return {
    show: setContent,
    dialog: <ComingSoonDialog content={content} onClose={() => setContent(null)} />,
  };
}
