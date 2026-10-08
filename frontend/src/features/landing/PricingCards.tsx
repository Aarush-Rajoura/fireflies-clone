"use client";

import { useState } from "react";
import { PRICING_TIERS, type BillingCycle, type PricingTier } from "./content";
import { Icon } from "./icons";
import { ButtonLink } from "./ui";
import { Pressable } from "@/components/ui";

function priceFor(tier: PricingTier, cycle: BillingCycle) {
  const value = cycle === "annual" ? tier.annual : tier.monthly;
  if (value === null) return { amount: "Custom", note: "Billed annually" };
  if (value === 0) return { amount: "$0", note: "Free forever" };
  return {
    amount: `$${value}`,
    note:
      cycle === "annual" ? "per seat / month, billed annually" : "per seat / month, billed monthly",
  };
}

/**
 * Monthly/annual toggle plus the four plan cards. Used on /pricing and (compact, without the
 * feature lists) as the landing teaser.
 */
export function PricingCards({ compact = false }: { compact?: boolean }) {
  const [cycle, setCycle] = useState<BillingCycle>("annual");

  return (
    <div>
      <div className="flex justify-center">
        <div
          role="group"
          aria-label="Billing cycle"
          className="inline-flex rounded-full border border-[var(--mk-line)] bg-[var(--mk-white)] p-1"
        >
          {(["monthly", "annual"] as const).map((c) => (
            <Pressable
              bare
              key={c}
              type="button"
              aria-pressed={cycle === c}
              onClick={() => setCycle(c)}
              className={`rounded-full px-5 py-2 text-[14px] font-medium transition-colors ${
                cycle === c
                  ? "bg-[var(--mk-navy)] text-[var(--mk-white)]"
                  : "text-[var(--mk-body)] hover:text-[var(--mk-ink)]"
              }`}
            >
              {c === "monthly" ? "Monthly" : "Annual"}
              {c === "annual" && (
                <span className="ml-2 rounded-full bg-[var(--mk-green-tint)] px-2 py-0.5 text-[11px] text-[var(--mk-green-ink)]">
                  Save up to 40%
                </span>
              )}
            </Pressable>
          ))}
        </div>
      </div>

      <ul className="mt-10 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {PRICING_TIERS.map((tier) => {
          const price = priceFor(tier, cycle);
          const hl = tier.highlight;
          return (
            <li
              key={tier.id}
              className={`relative flex flex-col rounded-2xl border p-6 ${
                hl
                  ? "border-[var(--mk-violet)] bg-[var(--mk-navy)] text-[var(--mk-on-dark)] shadow-[0_24px_60px_var(--mk-shadow-strong)]"
                  : "border-[var(--mk-line)] bg-[var(--mk-white)] text-[var(--mk-ink)]"
              }`}
            >
              {hl && (
                <span className="absolute -top-3 left-6 rounded-full bg-[var(--mk-violet)] px-3 py-1 text-[12px] font-medium text-[var(--mk-white)]">
                  Most popular
                </span>
              )}
              <h3 className="mk-display text-[22px] font-medium">{tier.name}</h3>
              <p
                className={`mt-1.5 min-h-[44px] text-[14px] ${hl ? "text-[var(--mk-on-dark-muted)]" : "text-[var(--mk-body)]"}`}
              >
                {tier.blurb}
              </p>
              <p className="mt-5 flex items-baseline gap-1">
                <span
                  className="mk-display text-[40px] font-medium leading-none"
                  aria-live="polite"
                >
                  {price.amount}
                </span>
              </p>
              <p
                className={`mt-2 text-[13px] ${hl ? "text-[var(--mk-on-dark-muted)]" : "text-[var(--mk-muted)]"}`}
              >
                {price.note}
              </p>
              <ButtonLink
                href={tier.href}
                variant={hl ? "primary" : "ghost"}
                className="mt-6 w-full"
              >
                {tier.cta}
              </ButtonLink>
              {!compact && (
                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f) => (
                    <li
                      key={f}
                      className={`flex gap-2.5 text-[14px] ${hl ? "text-[var(--mk-on-dark-muted)]" : "text-[var(--mk-body)]"}`}
                    >
                      <Icon
                        name="check"
                        size={18}
                        className={`shrink-0 ${hl ? "text-[var(--mk-violet-soft)]" : "text-[var(--mk-violet)]"}`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
