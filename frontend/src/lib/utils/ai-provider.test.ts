import { describe, expect, it } from "vitest";

import { aiProviderLabel } from "./ai-provider";

describe("aiProviderLabel", () => {
  it("names the real model, the offline demo and a fallback", () => {
    expect(aiProviderLabel("gemini")).toBe("Answered by Gemini");
    expect(aiProviderLabel("mock")).toBe("Demo AI (offline)");
    expect(aiProviderLabel("mock (llm fallback)")).toBe("Demo AI (Gemini unavailable)");
    expect(aiProviderLabel(null)).toBeNull();
  });
});
