import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";

import { Highlighter, segment } from "./highlighter";

const marks = (c: HTMLElement) => [...c.querySelectorAll("mark")].map((m) => m.textContent);

describe("Highlighter", () => {
  test("wraps exactly the given ranges", () => {
    const { container } = render(
      <Highlighter text="ship it on Friday, review Friday" ranges={[{ start: 11, end: 17 }, { start: 26, end: 32 }]} />,
    );
    expect(marks(container)).toEqual(["Friday", "Friday"]);
    expect(container.textContent).toBe("ship it on Friday, review Friday");
  });

  test("renders HTML in the text literally, never as markup", () => {
    const text = "say <script>alert(1)</script> now";
    const { container } = render(<Highlighter text={text} ranges={[{ start: 4, end: 12 }]} />);
    expect(container.querySelector("script")).toBeNull();
    expect(marks(container)).toEqual(["<script>"]);
    expect(container.textContent).toBe(text);
  });

  test("marks the active match", () => {
    const { container } = render(
      <Highlighter text="a b a" ranges={[{ start: 0, end: 1 }, { start: 4, end: 5 }]} activeIndex={1} />,
    );
    const current = container.querySelector('mark[aria-current="true"]');
    expect(current?.getAttribute("data-match-index")).toBe("1");
    expect(current?.className).toContain("bg-highlight-active");
  });

  test("overlapping ranges render every character once", () => {
    const segs = segment("abcdefgh", [{ start: 1, end: 5 }, { start: 3, end: 7 }]);
    expect(segs.map((s) => s.text).join("")).toBe("abcdefgh");
    expect(segs.filter((s) => s.match !== undefined).map((s) => s.text)).toEqual(["bcde", "fg"]);
  });

  test("out-of-range, empty and inverted ranges are clamped or dropped", () => {
    const segs = segment("hello", [{ start: -5, end: 2 }, { start: 3, end: 99 }, { start: 4, end: 4 }, { start: 5, end: 1 }, { start: Number.NaN, end: 2 }]);
    expect(segs).toEqual([
      { text: "he", match: 0 },
      { text: "l" },
      { text: "lo", match: 1 },
    ]);
  });

  test("no ranges renders plain text", () => {
    const { container } = render(<Highlighter text="plain" ranges={[]} />);
    expect(container.querySelector("mark")).toBeNull();
    expect(container.textContent).toBe("plain");
  });
});
