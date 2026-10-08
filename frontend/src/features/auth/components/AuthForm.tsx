"use client";

import { Info, Lock, Mail, Sparkles } from "lucide-react";
import Link from "next/link";
import { useState, type FormEvent } from "react";

import { Button, Field, Input, toast } from "@/components/ui";

import { useDemoSignIn } from "../hooks/useDemoSignIn";
import { validateCredentials, type AuthMode, type CredentialErrors } from "../lib/credentials";

import { GoogleMark, MicrosoftMark } from "./ProviderMarks";

const COPY = {
  login: {
    title: "Welcome back",
    lead: "Log in to your meeting notes, transcripts and Ask Fred.",
    submit: "Log in",
    swap: { prompt: "New to Fireflies?", label: "Create an account", href: "/signup" },
  },
  signup: {
    title: "Create your free account",
    lead: "Record, transcribe and summarize every meeting with Fred.",
    submit: "Create account",
    swap: { prompt: "Already have an account?", label: "Log in", href: "/login" },
  },
} as const;

const comingSoon = (provider: string) => () =>
  toast.info(`Continue with ${provider} is coming soon. Use the demo account for now.`);

export function AuthForm({ mode }: { mode: AuthMode }) {
  const copy = COPY[mode];
  const signIn = useDemoSignIn();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<CredentialErrors>({});

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    const found = validateCredentials(mode, { email, password });
    setErrors(found);
    if (Object.keys(found).length === 0) signIn.mutate(mode);
  };

  return (
    <div className="flex w-full max-w-modal-sm flex-col gap-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-display text-strong">{copy.title}</h1>
        <p className="text-body text-secondary">{copy.lead}</p>
      </div>

      <Button
        variant="primary"
        className="h-input w-full"
        leadingIcon={<Sparkles strokeWidth={1.75} />}
        loading={signIn.isPending}
        onClick={() => signIn.mutate(mode)}
      >
        Continue with demo account
      </Button>

      <div className="grid grid-cols-2 gap-3">
        <Button className="h-input" leadingIcon={<GoogleMark />} onClick={comingSoon("Google")}>
          Google
        </Button>
        <Button
          className="h-input"
          leadingIcon={<MicrosoftMark />}
          onClick={comingSoon("Microsoft")}
        >
          Microsoft
        </Button>
      </div>

      <div className="flex items-center gap-3 text-caption text-muted" aria-hidden>
        <span className="h-px flex-1 bg-divider" />
        or with email
        <span className="h-px flex-1 bg-divider" />
      </div>

      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4" aria-label={copy.submit}>
        <Field label="Work email" htmlFor={`${mode}-email`} error={errors.email}>
          <Input
            id={`${mode}-email`}
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            leadingIcon={<Mail strokeWidth={1.75} />}
            invalid={Boolean(errors.email)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>
        <Field
          label="Password"
          htmlFor={`${mode}-password`}
          error={errors.password}
          hint={mode === "signup" ? "At least 8 characters." : undefined}
        >
          <Input
            id={`${mode}-password`}
            type="password"
            autoComplete={mode === "signup" ? "new-password" : "current-password"}
            placeholder="••••••••"
            leadingIcon={<Lock strokeWidth={1.75} />}
            invalid={Boolean(errors.password)}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <Button type="submit" className="h-input w-full" disabled={signIn.isPending}>
          {copy.submit}
        </Button>
      </form>

      <p
        role="note"
        className="flex items-start gap-2 rounded-panel border border-accent-border bg-accent-faint p-3 text-meta text-secondary"
      >
        <Info className="mt-0.5 size-4 shrink-0 text-accent" strokeWidth={1.75} aria-hidden />
        <span>
          <span className="text-body-strong text-primary">Demo mode</span> — no real account is
          created and nothing you type is sent. Every option continues as the demo user.
        </span>
      </p>

      <p className="text-meta text-muted">
        {copy.swap.prompt}{" "}
        <Link href={copy.swap.href} className="text-accent hover:underline">
          {copy.swap.label}
        </Link>
      </p>
    </div>
  );
}
