"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { MEGA_MENUS, NAV_LINKS, ROUTES } from "./content";
import { DemoButton } from "./DemoModal";
import { Icon } from "./icons";
import { Wordmark } from "./marks";
import { ButtonLink } from "./ui";
import { Pressable } from "@/components/ui";

/** Full-screen menu for small screens; each mega-menu becomes an accordion section. */
export function MobileMenu({ onClose }: { onClose: () => void }) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const closeBtn = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeBtn.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  return (
    <div
      id="mk-mobile-menu"
      role="dialog"
      aria-modal="true"
      aria-label="Site menu"
      className="fixed inset-0 z-[68] flex flex-col bg-[var(--mk-navy)] lg:hidden"
    >
      <div className="flex h-[72px] shrink-0 items-center justify-between px-4 sm:px-6">
        <Link href={ROUTES.home} onClick={onClose} aria-label="fireflies.ai home">
          <Wordmark />
        </Link>
        <Pressable
          bare
          ref={closeBtn}
          type="button"
          onClick={onClose}
          aria-label="Close menu"
          className="rounded-md p-2 text-[var(--mk-white)]"
        >
          <Icon name="x" size={26} />
        </Pressable>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-8 sm:px-6">
        <ul className="divide-y divide-[var(--mk-line-dark)] border-y border-[var(--mk-line-dark)]">
          {MEGA_MENUS.map((menu) => {
            const isOpen = expanded === menu.id;
            return (
              <li key={menu.id}>
                <Pressable
                  bare
                  type="button"
                  aria-expanded={isOpen}
                  aria-controls={`mk-mobile-${menu.id}`}
                  onClick={() => setExpanded(isOpen ? null : menu.id)}
                  className="flex w-full items-center justify-between py-4 text-left text-lg font-medium text-[var(--mk-white)]"
                >
                  {menu.label}
                  <Icon
                    name="chevron-down"
                    size={20}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </Pressable>
                <ul id={`mk-mobile-${menu.id}`} hidden={!isOpen} className="space-y-1 pb-4">
                  {menu.columns.map((link) => (
                    <li key={link.title}>
                      <Link
                        href={link.href}
                        onClick={onClose}
                        className="block rounded-lg px-3 py-2.5 hover:bg-[var(--mk-white-08)]"
                      >
                        <span className="block text-[15px] text-[var(--mk-white)]">
                          {link.title}
                        </span>
                        <span className="mt-0.5 block text-sm text-[var(--mk-on-dark-muted)]">
                          {link.description}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
          {NAV_LINKS.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={onClose}
                className="block py-4 text-lg font-medium text-[var(--mk-white)]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="mt-8 grid gap-3">
          <DemoButton variant="white" size="lg" className="w-full" onOpen={onClose} />
          <ButtonLink
            href={ROUTES.login}
            variant="primary"
            size="lg"
            className="w-full"
            onClick={onClose}
          >
            Open App
          </ButtonLink>
          <div className="grid grid-cols-2 gap-3">
            <ButtonLink href={ROUTES.login} variant="secondary" size="md" onClick={onClose}>
              Log in
            </ButtonLink>
            <ButtonLink href={ROUTES.signup} variant="secondary" size="md" onClick={onClose}>
              Get Started
            </ButtonLink>
          </div>
        </div>
      </div>
    </div>
  );
}
