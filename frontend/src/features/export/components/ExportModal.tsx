"use client";

import { Download } from "lucide-react";
import { useState } from "react";

import { Button, Checkbox, Modal, SegmentedControl, toast } from "@/components/ui";
import type { ExportFormat } from "@/lib/api";

import { useExportDownload } from "../hooks/useExportDownload";
import { EXPORT_FORMATS, EXPORT_SECTIONS, type ExportSection } from "../lib/options";

export type ExportModalProps = {
  meetingId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

const ALL_SECTIONS = EXPORT_SECTIONS.map((s) => s.id);

/** Format + sections, then a download. Choices persist while the page lives, like a print dialog. */
export function ExportModal({ meetingId, open, onOpenChange }: ExportModalProps) {
  const download = useExportDownload(meetingId);
  const [format, setFormat] = useState<ExportFormat>("md");
  const [sections, setSections] = useState<ReadonlySet<ExportSection>>(() => new Set(ALL_SECTIONS));

  const toggle = (id: ExportSection, on: boolean) =>
    setSections((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });

  const submit = () => {
    download({ format, sections });
    onOpenChange(false);
    toast.success("Export started");
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Export meeting"
      description="Download the notes as a file."
      size="sm"
      footer={
        <>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            leadingIcon={<Download strokeWidth={1.75} />}
            disabled={sections.size === 0}
            onClick={submit}
          >
            Download
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <span className="text-label text-secondary">Format</span>
          <SegmentedControl
            label="Export format"
            options={EXPORT_FORMATS}
            value={format}
            onChange={setFormat}
            className="self-start"
          />
        </div>
        <fieldset className="flex flex-col gap-2.5">
          <legend className="mb-2 text-label text-secondary">Include</legend>
          {EXPORT_SECTIONS.map((s) => (
            <Checkbox
              key={s.id}
              label={s.label}
              checked={sections.has(s.id)}
              onCheckedChange={(on) => toggle(s.id, on)}
            />
          ))}
          {sections.size === 0 && (
            <p role="alert" className="text-caption text-danger-strong">
              Pick at least one section.
            </p>
          )}
        </fieldset>
      </div>
    </Modal>
  );
}
