import { describe, expect, it } from "vitest";

import type { TeamMember } from "@/lib/api";

import {
  absoluteInviteUrl,
  canEditMember,
  isLastOwner,
  roleOptions,
  tokenFromInviteUrl,
} from "./members";

const member = (over: Partial<TeamMember>): TeamMember => ({
  id: 1,
  team_id: 1,
  user_id: null,
  email: "a@x.io",
  display_name: null,
  avatar_url: null,
  role: "member",
  status: "active",
  invited_at: "2026-10-08T00:00:00Z",
  joined_at: null,
  invite_url: null,
  ...over,
});

describe("team member rules", () => {
  it("lets only owners edit owners", () => {
    const owner = member({ role: "owner" });
    expect(canEditMember("owner", owner)).toBe(true);
    expect(canEditMember("admin", owner)).toBe(false);
    expect(canEditMember("admin", member({}))).toBe(true);
    expect(canEditMember("member", member({}))).toBe(false);
  });

  it("disables the Owner option for non-owners", () => {
    expect(roleOptions("admin").find((o) => o.value === "owner")?.disabled).toBe(true);
    expect(roleOptions("owner").every((o) => !o.disabled)).toBe(true);
  });

  it("spots the last active owner", () => {
    const a = member({ id: 1, role: "owner" });
    const b = member({ id: 2, role: "owner", status: "invited" });
    expect(isLastOwner(a, [a, b])).toBe(true);
    expect(isLastOwner(a, [a, member({ id: 3, role: "owner" })])).toBe(false);
  });

  it("builds absolute links and extracts tokens", () => {
    expect(absoluteInviteUrl("/join/abc", "http://localhost:3000")).toBe(
      "http://localhost:3000/join/abc",
    );
    expect(tokenFromInviteUrl("/join/abc")).toBe("abc");
  });
});
