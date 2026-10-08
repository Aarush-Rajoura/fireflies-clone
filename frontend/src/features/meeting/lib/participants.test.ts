import { describe, expect, it } from "vitest";

import { meeting } from "../testing/fixtures";
import {
  addParticipant,
  buildMeetingPatch,
  draftsFrom,
  removeParticipant,
  validateEdit,
} from "./participants";

describe("participant editing", () => {
  const base = draftsFrom(meeting);

  it("adds a trimmed name and ignores blanks and case-insensitive duplicates", () => {
    const added = addParticipant(base, "  Dana   Lee ");
    expect(added.map((p) => p.display_name)).toEqual([
      "Sarah Watts",
      "Janice",
      "Chris",
      "Dana Lee",
    ]);
    expect(addParticipant(base, "   ")).toBe(base);
    expect(addParticipant(base, "janice")).toBe(base);
    expect(addParticipant(added, "DANA LEE")).toBe(added);
  });

  it("removes by position", () => {
    expect(removeParticipant(base, 1).map((p) => p.display_name)).toEqual(["Sarah Watts", "Chris"]);
  });

  it("validates the title and name lengths", () => {
    expect(validateEdit({ title: "  ", participants: base, channelId: null }).title).toMatch(
      /title/,
    );
    expect(
      validateEdit({ title: "x".repeat(301), participants: base, channelId: null }).title,
    ).toMatch(/300/);
    const long = [{ display_name: "y".repeat(201) }];
    expect(validateEdit({ title: "ok", participants: long, channelId: null }).participants).toMatch(
      /200/,
    );
    expect(validateEdit({ title: "ok", participants: base, channelId: null })).toEqual({});
  });
});

describe("buildMeetingPatch", () => {
  const form = { title: meeting.title, participants: draftsFrom(meeting), channelId: 3 };

  it("is empty when nothing changed", () => {
    expect(buildMeetingPatch(meeting, form)).toEqual({});
  });

  it("sends only changed fields: trimmed title and channel (null clears it)", () => {
    expect(buildMeetingPatch(meeting, { ...form, title: "  New title ", channelId: null })).toEqual(
      {
        title: "New title",
        channel_id: null,
      },
    );
  });

  it("maps existing participants with ids and new ones by name", () => {
    const participants = addParticipant(removeParticipant(form.participants, 2), "Dana");
    expect(buildMeetingPatch(meeting, { ...form, participants })).toEqual({
      participants: [
        { id: 11, display_name: "Sarah Watts" },
        { id: 12, display_name: "Janice" },
        { display_name: "Dana" },
      ],
    });
  });
});
