"use client";

import { CalendarDays, Check, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Button, DatePicker, Field, Input, Modal, Switch, toast } from "@/components/ui";
import { ApiError, type CalendarProvider } from "@/lib/api";

import { PROVIDER_LABEL, useConnectCalendar, useConnectedProviders } from "../hooks/useCalendar";
import { useCreateMeeting } from "@/features/create";
import {
  defaultSchedule,
  scheduleBody,
  validateSchedule,
  type FormErrors,
  type ScheduleForm,
} from "../lib/meeting-forms";

export type ScheduleModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Called after a calendar import or a manual schedule, e.g. to show the Upcoming tab. */
  onScheduled?: () => void;
};

const PROVIDERS: { provider: CalendarProvider; icon: React.ReactNode }[] = [
  { provider: "google", icon: <CalendarDays strokeWidth={1.75} /> },
  { provider: "outlook", icon: <Mail strokeWidth={1.75} /> },
];

/** Schedule Fred: connect a (simulated) calendar, or add one meeting by hand. */
export function ScheduleModal({ open, onOpenChange, onScheduled }: ScheduleModalProps) {
  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title="Schedule a meeting"
      description="Fred joins your upcoming meetings and takes notes."
    >
      {/* Remounted on every open so the form starts fresh with a future default time. */}
      {open && <ScheduleBody onDone={() => onOpenChange(false)} onScheduled={onScheduled} />}
    </Modal>
  );
}

function ScheduleBody({ onDone, onScheduled }: { onDone: () => void; onScheduled?: () => void }) {
  const [form, setForm] = useState<ScheduleForm>(() => defaultSchedule());
  const [errors, setErrors] = useState<FormErrors<ScheduleForm>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const connected = useConnectedProviders();
  const finish = () => {
    onScheduled?.();
    onDone();
  };
  const connect = useConnectCalendar({ onConnected: finish });
  const create = useCreateMeeting({
    onSuccess: (meeting) => {
      toast.success(`“${meeting.title}” scheduled`);
      finish();
    },
  });

  const set = <K extends keyof ScheduleForm>(key: K, value: ScheduleForm[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);
    const found = validateSchedule(form);
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    create.mutate(scheduleBody(form), {
      onError: (error) => {
        if (error instanceof ApiError && error.code === "SCHEDULED_IN_PAST") {
          setErrors({ date: "Pick a time in the future" });
        } else {
          setFormError(error instanceof ApiError ? error.message : "Couldn't schedule. Try again.");
        }
      },
    });
  };

  return (
    <div className="flex flex-col gap-5 pb-2">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {PROVIDERS.map(({ provider, icon }) => {
          const isConnected = connected.has(provider);
          return (
            <Button
              key={provider}
              leadingIcon={isConnected ? <Check strokeWidth={1.75} /> : icon}
              disabled={isConnected || connect.isPending}
              loading={connect.isPending && connect.variables === provider}
              onClick={() => connect.mutate(provider)}
            >
              {isConnected
                ? `${PROVIDER_LABEL[provider]} connected`
                : `Connect ${PROVIDER_LABEL[provider]}`}
            </Button>
          );
        })}
      </div>
      <p className="-mt-3 text-caption text-muted">
        Demo only: connecting imports 3 sample meetings, not your real calendar.
      </p>

      <div className="flex items-center gap-3 text-caption text-muted">
        <span aria-hidden className="h-px flex-1 bg-divider" />
        or schedule one manually
        <span aria-hidden className="h-px flex-1 bg-divider" />
      </div>

      <form id="schedule-form" onSubmit={submit} noValidate className="flex flex-col gap-4">
        <Field label="Meeting name" htmlFor="schedule-title" error={errors.title}>
          <Input
            id="schedule-title"
            value={form.title}
            invalid={!!errors.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Weekly product sync"
            maxLength={300}
          />
        </Field>
        <Field label="Date and time" htmlFor="schedule-date" error={errors.date}>
          <div className="flex gap-2">
            <DatePicker
              id="schedule-date"
              label="Date"
              value={form.date}
              onChange={(v) => set("date", v)}
              className="flex-1"
            />
            <Input
              type="time"
              aria-label="Time"
              value={form.time}
              invalid={!!errors.date}
              onChange={(e) => set("time", e.target.value)}
              className="tnum w-36"
            />
          </div>
        </Field>
        <Field
          label="Meeting link"
          htmlFor="schedule-link"
          hint="Zoom, Google Meet or Teams. Optional."
          error={errors.meetingUrl}
        >
          <Input
            id="schedule-link"
            type="url"
            inputMode="url"
            value={form.meetingUrl}
            invalid={!!errors.meetingUrl}
            onChange={(e) => set("meetingUrl", e.target.value)}
            placeholder="https://meet.google.com/abc-defg-hij"
          />
        </Field>
        <Switch
          label="Fred joins automatically"
          checked={form.autoJoin}
          onCheckedChange={(v) => set("autoJoin", v)}
        />
        {formError && (
          <p role="alert" className="text-caption text-danger-strong">
            {formError}
          </p>
        )}
        <div className="flex justify-end gap-2 pt-1">
          <Button onClick={onDone}>Cancel</Button>
          <Button type="submit" variant="primary" loading={create.isPending}>
            Schedule
          </Button>
        </div>
      </form>
    </div>
  );
}
