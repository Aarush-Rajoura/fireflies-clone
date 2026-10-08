import { describe, expect, it } from "vitest";

import { MAX_UPLOAD_BYTES, titleFromFileName, validateTranscriptFile } from "./file-validation";

const file = (name: string, size = 100) => ({ name, size });

describe("validateTranscriptFile", () => {
  it.each(["call.txt", "call.vtt", "call.srt", "call.json", "CALL.VTT", "a.b.srt"])(
    "accepts %s",
    (name) => expect(validateTranscriptFile(file(name))).toBeNull(),
  );

  it.each(["call.mp3", "call.mp4", "call.docx", "call", "vtt", "call.vtt.exe"])(
    "rejects %s by type",
    (name) => expect(validateTranscriptFile(file(name))).toMatch(/isn't a supported transcript/),
  );

  it("accepts exactly 10 MB and rejects one byte more", () => {
    expect(validateTranscriptFile(file("big.vtt", MAX_UPLOAD_BYTES))).toBeNull();
    expect(validateTranscriptFile(file("big.vtt", MAX_UPLOAD_BYTES + 1))).toBe(
      "“big.vtt” is larger than 10 MB.",
    );
  });

  it("rejects an empty file", () => {
    expect(validateTranscriptFile(file("empty.txt", 0))).toBe("“empty.txt” is empty.");
  });
});

describe("titleFromFileName", () => {
  it("drops the extension and turns separators into spaces", () => {
    expect(titleFromFileName("weekly_product-sync.vtt")).toBe("weekly product sync");
    expect(titleFromFileName("q3.review.final.srt")).toBe("q3.review.final");
    expect(titleFromFileName(".hidden")).toBe(".hidden");
  });
});
