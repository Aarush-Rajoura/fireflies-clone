"use client";

import { RotateCcw } from "lucide-react";
import { useState, type FormEvent } from "react";

import { Avatar, Button, Field, Input, Skeleton } from "@/components/ui";
import { useMe } from "@/features/user";
import type { Me } from "@/lib/api";

import { useRestartOnboarding, useUpdateProfile } from "../hooks/useProfileMutations";

const card = "flex flex-col gap-4 rounded-card border border-subtle bg-surface-1 p-5";

function ProfileForm({ me }: { me: Me }) {
  const update = useUpdateProfile();
  const [name, setName] = useState(me.name);
  const [jobTitle, setJobTitle] = useState(me.job_title ?? "");
  const nameError = name.trim() ? undefined : "Name can't be empty.";
  const dirty = name.trim() !== me.name || jobTitle.trim() !== (me.job_title ?? "");

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (nameError || !dirty) return;
    update.mutate({ name: name.trim(), job_title: jobTitle.trim() });
  };

  return (
    <form onSubmit={onSubmit} noValidate className={card} aria-label="Profile">
      <div className="flex items-center gap-4">
        <Avatar name={me.name} src={me.avatar_url ?? undefined} size="lg" />
        <div className="min-w-0">
          <p className="truncate text-h3 text-strong">{me.name}</p>
          <p className="truncate text-meta text-muted">{me.email}</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" htmlFor="profile-name" error={nameError}>
          <Input
            id="profile-name"
            autoComplete="name"
            maxLength={200}
            invalid={Boolean(nameError)}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label="Job title" htmlFor="profile-title">
          <Input
            id="profile-title"
            maxLength={150}
            placeholder="e.g. Product Manager"
            value={jobTitle}
            onChange={(e) => setJobTitle(e.target.value)}
          />
        </Field>
      </div>
      <Button
        type="submit"
        variant="primary"
        className="self-end"
        disabled={!dirty || Boolean(nameError)}
        loading={update.isPending}
      >
        Save changes
      </Button>
    </form>
  );
}

function OnboardingCard() {
  const restart = useRestartOnboarding();
  return (
    <div className={card}>
      <div>
        <p className="text-body-strong text-primary">Onboarding</p>
        <p className="text-meta text-muted">
          Walk through the setup questions again: which meetings Fred joins, who gets recaps, your
          role and tools. Your current answers are pre-filled.
        </p>
      </div>
      <Button
        className="self-start"
        leadingIcon={<RotateCcw strokeWidth={1.75} />}
        loading={restart.isPending}
        onClick={() => restart.mutate()}
      >
        Restart onboarding
      </Button>
    </div>
  );
}

export function ProfileTab() {
  const { data: me, isLoading } = useMe();
  if (isLoading || !me) return <Skeleton className="h-40 w-full" />;
  return (
    <div className="flex flex-col gap-4">
      {/* Keyed so the form resets to the server values after a save elsewhere. */}
      <ProfileForm key={`${me.name}|${me.job_title ?? ""}`} me={me} />
      <OnboardingCard />
    </div>
  );
}
