import { describe, expect, it } from "vitest";

import { validateCredentials } from "./credentials";

describe("validateCredentials", () => {
  it("requires both fields", () => {
    expect(validateCredentials("login", { email: "", password: "" })).toEqual({
      email: "Enter your work email.",
      password: "Enter a password.",
    });
  });

  it("rejects a malformed email", () => {
    expect(validateCredentials("login", { email: "ana@", password: "x" }).email).toBe(
      "Enter a valid email address.",
    );
  });

  it("asks for a longer password only when signing up", () => {
    const short = { email: "ana@acme.io", password: "short" };
    expect(validateCredentials("login", short)).toEqual({});
    expect(validateCredentials("signup", short).password).toMatch(/at least 8/);
    expect(validateCredentials("signup", { ...short, password: "longenough" })).toEqual({});
  });
});
