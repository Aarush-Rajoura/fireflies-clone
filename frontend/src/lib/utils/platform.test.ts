import { describe, expect, it } from "vitest";

import { isApplePlatform } from "./platform";

describe("isApplePlatform", () => {
  it("detects macOS and iOS from client hints, platform or user agent", () => {
    expect(isApplePlatform({ userAgentData: { platform: "macOS" } })).toBe(true);
    expect(isApplePlatform({ platform: "MacIntel" })).toBe(true);
    expect(isApplePlatform({ userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)" })).toBe(true);
  });

  it("is false elsewhere and when there is no navigator", () => {
    expect(isApplePlatform({ userAgentData: { platform: "Windows" }, platform: "Win32" })).toBe(
      false,
    );
    expect(isApplePlatform({ platform: "Linux x86_64" })).toBe(false);
    expect(isApplePlatform(undefined)).toBe(false);
  });
});
