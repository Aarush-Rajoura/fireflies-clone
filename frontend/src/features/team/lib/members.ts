import type { TeamMember, TeamRole } from "@/lib/api";

export const ROLE_LABELS: Record<TeamRole, string> = {
  owner: "Owner",
  admin: "Admin",
  member: "Member",
};

export const canManageTeam = (myRole: TeamRole): boolean =>
  myRole === "owner" || myRole === "admin";

/**
 * Mirrors the backend's rules so the UI never offers a change the server will
 * refuse: managers edit members; only owners touch ownership.
 */
export function canEditMember(myRole: TeamRole, member: TeamMember): boolean {
  if (!canManageTeam(myRole)) return false;
  return member.role !== "owner" || myRole === "owner";
}

/** Role choices for one member's Select; "Owner" is offered only to owners. */
export function roleOptions(myRole: TeamRole) {
  return (Object.keys(ROLE_LABELS) as TeamRole[]).map((role) => ({
    value: role,
    label: ROLE_LABELS[role],
    disabled: role === "owner" && myRole !== "owner",
  }));
}

/** The only active owner: demoting or removing them would leave the team ownerless. */
export function isLastOwner(member: TeamMember, members: readonly TeamMember[]): boolean {
  if (member.role !== "owner" || member.status !== "active") return false;
  return members.filter((m) => m.role === "owner" && m.status === "active").length <= 1;
}

export const memberName = (m: TeamMember): string => m.display_name || m.email;

const dateFormat = new Intl.DateTimeFormat("en-US", {
  month: "short",
  day: "numeric",
  year: "numeric",
});

export function formatDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? "—" : dateFormat.format(date);
}

/** Invite paths are app-relative; a copyable link needs the origin the user is on. */
export function absoluteInviteUrl(path: string, origin: string): string {
  return new URL(path, origin).toString();
}

export const tokenFromInviteUrl = (path: string): string => path.split("/").pop() ?? "";
