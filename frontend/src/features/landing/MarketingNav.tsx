"use client";

import Link from "next/link";
import { useCallback, useEffect, useReducer, useRef, useState, type KeyboardEvent } from "react";
import { MEGA_MENUS, NAV_LINKS, ROUTES } from "./content";
import { DemoButton } from "./DemoModal";
import { Icon } from "./icons";
import { Wordmark } from "./marks";
import { MegaMenu, megaItemCount } from "./MegaMenu";
import { initialMenuState, menuKeyAction, menuReducer, triggerClickAction } from "./menuState";
import { MobileMenu } from "./MobileMenu";
import { ButtonLink } from "./ui";

const HOVER_CLOSE_DELAY = 140;

export function MarketingNav() {
  const [state, dispatch] = useReducer(menuReducer, initialMenuState);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navRef = useRef<HTMLElement>(null);
  const triggers = useRef<Record<string, HTMLButtonElement | null>>({});
  const items = useRef<(HTMLAnchorElement | null)[]>([]);
  const closeTimer = useRef<number | undefined>(undefined);
  const hoverOpenedAt = useRef(0);
  const hamburger = useRef<HTMLButtonElement>(null);

  // Move DOM focus whenever the reducer picks a new active item.
  useEffect(() => {
    if (state.openId && state.activeIndex >= 0) items.current[state.activeIndex]?.focus();
  }, [state.openId, state.activeIndex]);

  // Close on outside click and on Escape while the menu was opened by hover.
  useEffect(() => {
    if (!state.openId) return;
    function onPointer(e: PointerEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) dispatch({ type: "close" });
    }
    function onKey(e: globalThis.KeyboardEvent) {
      if (e.key === "Escape") dispatch({ type: "close" });
    }
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [state.openId]);

  useEffect(() => () => window.clearTimeout(closeTimer.current), []);

  // Event timestamps (not Date.now) keep render pure and share one clock with the click event.
  const hoverOpen = (id: string, at: number) => {
    window.clearTimeout(closeTimer.current);
    if (state.openId !== id) hoverOpenedAt.current = at;
    dispatch({ type: "open", id });
  };
  const hoverClose = () => {
    window.clearTimeout(closeTimer.current);
    closeTimer.current = window.setTimeout(() => dispatch({ type: "close" }), HOVER_CLOSE_DELAY);
  };

  const handleKey =
    (id: string, where: "trigger" | "item", total: number) => (e: KeyboardEvent<HTMLElement>) => {
      const result = menuKeyAction(e.key, where, { id, openId: state.openId, count: total });
      if (!result) return;
      e.preventDefault();
      e.stopPropagation();
      dispatch(result.action);
      if (result.restoreFocus) triggers.current[id]?.focus();
    };

  const registerItem = useCallback((index: number, el: HTMLAnchorElement | null) => {
    items.current[index] = el;
  }, []);

  const closeMobile = useCallback(() => {
    setMobileOpen(false);
    hamburger.current?.focus();
  }, []);

  return (
    <header className="relative z-50 bg-[var(--mk-navy)]">
      <nav
        ref={navRef}
        aria-label="Main"
        className="relative mx-auto flex h-[72px] w-full max-w-[1280px] items-stretch px-4 sm:px-6 lg:h-[84px] lg:px-8"
      >
        <Link
          href={ROUTES.home}
          className="flex items-center self-center rounded-md"
          aria-label="fireflies.ai home"
        >
          <Wordmark />
        </Link>

        <ul
          className="ml-6 hidden items-stretch lg:flex xl:ml-10"
          onBlur={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node | null))
              dispatch({ type: "close" });
          }}
        >
          {MEGA_MENUS.map((menu) => {
            const isOpen = state.openId === menu.id;
            const total = megaItemCount(menu);
            return (
              <li
                key={menu.id}
                className="flex items-center"
                onMouseEnter={(e) => hoverOpen(menu.id, e.timeStamp)}
                onMouseLeave={hoverClose}
              >
                <button
                  type="button"
                  id={`mk-trigger-${menu.id}`}
                  ref={(el) => {
                    triggers.current[menu.id] = el;
                  }}
                  aria-expanded={isOpen}
                  aria-controls={`mk-menu-${menu.id}`}
                  onKeyDown={handleKey(menu.id, "trigger", total)}
                  onClick={(e) => {
                    const action = triggerClickAction(
                      menu.id,
                      state.openId,
                      e.timeStamp - hoverOpenedAt.current,
                    );
                    if (action) dispatch(action);
                  }}
                  className={`flex items-center gap-1 rounded-md px-2 py-2 text-[14px] font-medium transition-colors xl:px-3.5 xl:text-[16px] ${
                    isOpen
                      ? "text-[var(--mk-white)]"
                      : "text-[var(--mk-on-dark-muted)] hover:text-[var(--mk-white)]"
                  }`}
                >
                  {menu.label}
                  <Icon
                    name="chevron-down"
                    size={16}
                    className={`transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
                {isOpen && (
                  <MegaMenu
                    menu={menu}
                    panelId={`mk-menu-${menu.id}`}
                    labelledBy={`mk-trigger-${menu.id}`}
                    registerItem={registerItem}
                    onItemKeyDown={handleKey(menu.id, "item", total)}
                    onNavigate={() => dispatch({ type: "close" })}
                  />
                )}
              </li>
            );
          })}
          {NAV_LINKS.map((link) => (
            <li key={link.href} className="flex items-center">
              <Link
                href={link.href}
                className="rounded-md px-2 py-2 text-[14px] font-medium text-[var(--mk-on-dark-muted)] hover:text-[var(--mk-white)] xl:px-3.5 xl:text-[16px]"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <div className="ml-auto hidden items-center gap-3 lg:flex">
          <Link
            href={ROUTES.login}
            className="hidden rounded-md px-2 py-2 text-[15px] font-medium text-[var(--mk-on-dark-muted)] hover:text-[var(--mk-white)] 2xl:inline-flex"
          >
            Log in
          </Link>
          <DemoButton variant="white" size="md" className="xl:h-12 xl:text-[17px]" />
          <ButtonLink
            href={ROUTES.login}
            variant="primary"
            size="md"
            className="xl:h-12 xl:text-[17px]"
          >
            Open App
          </ButtonLink>
        </div>

        <button
          ref={hamburger}
          type="button"
          onClick={() => setMobileOpen(true)}
          aria-expanded={mobileOpen}
          aria-controls="mk-mobile-menu"
          aria-label="Open menu"
          className="ml-auto self-center rounded-md p-2 text-[var(--mk-white)] lg:hidden"
        >
          <Icon name="menu" size={26} />
        </button>
      </nav>
      {mobileOpen && <MobileMenu onClose={closeMobile} />}
    </header>
  );
}
