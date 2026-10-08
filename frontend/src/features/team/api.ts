import {
  ApiError,
  unwrap,
  type Team,
  type TeamInviteCreate,
  type TeamInviteResult,
  type TeamMember,
  type TeamRole,
} from "@/lib/api";
import { api } from "@/lib/api/client";

/** The current user's team; `null` (not an error) when they have none yet. */
export async function fetchMyTeam(signal?: AbortSignal): Promise<Team | null> {
  try {
    return await unwrap(api.GET("/api/v1/teams/me", { signal }));
  } catch (error) {
    if (error instanceof ApiError && error.code === "NO_TEAM") return null;
    throw error;
  }
}

export function createTeam(name: string): Promise<Team> {
  return unwrap(api.POST("/api/v1/teams", { body: { name } }));
}

export function renameTeam(id: number, name: string): Promise<Team> {
  return unwrap(
    api.PATCH("/api/v1/teams/{team_id}", { params: { path: { team_id: id } }, body: { name } }),
  );
}

export function inviteMembers(teamId: number, body: TeamInviteCreate): Promise<TeamInviteResult> {
  return unwrap(
    api.POST("/api/v1/teams/{team_id}/members", {
      params: { path: { team_id: teamId } },
      body,
    }),
  );
}

export function changeMemberRole(id: number, role: TeamRole): Promise<TeamMember> {
  return unwrap(
    api.PATCH("/api/v1/team-members/{member_id}", {
      params: { path: { member_id: id } },
      body: { role },
    }),
  );
}

export function removeMember(id: number): Promise<void> {
  return unwrap(
    api.DELETE("/api/v1/team-members/{member_id}", { params: { path: { member_id: id } } }),
  ) as Promise<void>;
}

/** Demo stand-in for the invitee opening the emailed link. */
export function acceptInvite(token: string): Promise<TeamMember> {
  return unwrap(api.POST("/api/v1/team-invites/{token}/accept", { params: { path: { token } } }));
}
