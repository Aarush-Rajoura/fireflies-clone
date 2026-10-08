import {
  AudioLines,
  Bot,
  ChartNoAxesColumn,
  Home,
  Layers,
  ListChecks,
  Settings,
  Sparkles,
  UserPlus,
  Video,
  Zap,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  icon: LucideIcon;
  /** Absent for features that are visible but not built: clicking explains instead of navigating. */
  href?: string;
  /** Small status dot on the icon, e.g. Live Assist. */
  dot?: boolean;
  /** AskFred's icon keeps the accent colour even when idle, as in the product. */
  accent?: boolean;
};

/** Top-of-rail groups, separated by dividers. Order matches the product. */
export const NAV_GROUPS: readonly (readonly NavItem[])[] = [
  [
    { id: "home", label: "Home", icon: Home, href: "/home" },
    { id: "askfred", label: "AskFred", icon: Bot, href: "/askfred", accent: true },
  ],
  [
    { id: "meetings", label: "Meetings", icon: Video, href: "/meetings" },
    { id: "tasks", label: "Tasks", icon: ListChecks, href: "/tasks" },
    { id: "apps", label: "AI Apps", icon: Sparkles, href: "/apps" },
  ],
  [
    { id: "analytics", label: "Analytics", icon: ChartNoAxesColumn, href: "/analytics" },
    { id: "voice-agent", label: "Voice agent", icon: AudioLines },
  ],
  [{ id: "live-assist", label: "Live Assist", icon: Zap, dot: true }],
];

export const NAV_FOOTER: readonly NavItem[] = [
  // Lands on the team page with the invite dialog already open.
  { id: "team", label: "Invite team", icon: UserPlus, href: "/team?invite=1" },
  { id: "integrations", label: "Integrations", icon: Layers, href: "/integrations" },
  { id: "settings", label: "Settings", icon: Settings, href: "/settings" },
];

const ALL_ITEMS: readonly NavItem[] = [...NAV_GROUPS.flat(), ...NAV_FOOTER];

/** Exact match or a sub-path ("/meetings/7" keeps Meetings lit), never a mere prefix ("/meetingsx"). */
export function isActive(pathname: string, href: string | undefined): boolean {
  if (!href) return false;
  const target = href.split("?")[0] ?? href;
  const path = pathname.replace(/\/+$/, "") || "/";
  return path === target || path.startsWith(`${target}/`);
}

/** Titles for routes that have no rail item of their own. */
const EXTRA_TITLES: Record<string, string> = { "/search": "Search", "/team": "Team" };

/** The top-bar title for a path: the owning rail item's label, or a known page name. */
export function titleForPath(pathname: string): string {
  const extra = Object.keys(EXTRA_TITLES).find((href) => isActive(pathname, href));
  if (extra) return EXTRA_TITLES[extra] ?? "";
  return ALL_ITEMS.find((item) => isActive(pathname, item.href))?.label ?? "";
}
