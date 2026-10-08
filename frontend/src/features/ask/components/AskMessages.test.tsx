import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { AskMessages } from "./AskMessages";

describe("AskMessages", () => {
  it("says which AI wrote each answer", () => {
    render(
      <AskMessages
        messages={[
          { id: 1, role: "user", text: "What was decided?", citations: [] },
          {
            id: 2,
            role: "assistant",
            text: "They chose to launch.",
            citations: [],
            provider: "mock (llm fallback)",
          },
        ]}
        pending={false}
        error={null}
        onRetry={() => {}}
        citationMode="seek"
      />,
    );
    expect(screen.getByText("Demo AI (Gemini unavailable)")).toBeTruthy();
  });
});
