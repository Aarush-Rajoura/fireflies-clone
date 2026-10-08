"use client";

import { FileUp, Info } from "lucide-react";
import { useState } from "react";

import { Button, Field, Input, Modal, Select } from "@/components/ui";
import { openCreateMeeting } from "@/features/create";

const LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "hi", label: "Hindi" },
  { value: "pt", label: "Portuguese" },
  { value: "ja", label: "Japanese" },
];

export type CaptureModalProps = { open: boolean; onOpenChange: (open: boolean) => void };

/**
 * "Add Fred to a live meeting". There is no meeting bot in this demo, so the
 * form is real but the join is not; the way forward is the transcript upload.
 */
export function CaptureModal({ open, onOpenChange }: CaptureModalProps) {
  const [name, setName] = useState("");
  const [link, setLink] = useState("");
  const [language, setLanguage] = useState("en");

  const toUpload = () => {
    onOpenChange(false);
    openCreateMeeting("upload");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Add Fred to a live meeting"
      description="Fred joins your Zoom, Google Meet or Teams call and takes notes for you."
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button variant="primary" leadingIcon={<FileUp strokeWidth={1.75} />} onClick={toUpload}>
            Upload a transcript
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <Field label="Meeting name" htmlFor="capture-name" hint="Optional">
          <Input
            id="capture-name"
            value={name}
            placeholder="e.g. Weekly product sync"
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Meeting link" htmlFor="capture-link">
          <Input
            id="capture-link"
            type="url"
            value={link}
            placeholder="https://zoom.us/j/…"
            onChange={(e) => setLink(e.target.value)}
          />
        </Field>
        <Field label="Meeting language" htmlFor="capture-language">
          <Select
            id="capture-language"
            options={LANGUAGES}
            value={language}
            onValueChange={setLanguage}
          />
        </Field>
        <p
          role="note"
          className="flex items-start gap-2 rounded-item border border-accent-border bg-accent-subtle px-3 py-2 text-meta text-primary"
        >
          <Info className="mt-px size-4 shrink-0 text-accent" strokeWidth={1.75} />
          Fred can&apos;t join live calls in this demo — upload a transcript instead.
        </p>
      </div>
    </Modal>
  );
}
