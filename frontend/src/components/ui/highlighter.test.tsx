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

  test("renders several coloured highlights with their tone and id", () => {
    const { container } = render(
      <Highlighter
        text="ship it on Friday, review Monday"
        ranges={[
          { start: 0, end: 7, tone: "green", id: 4 },
          { start: 26, end: 32, tone: "pink", id: 9 },
        ]}
      />,
    );
    const found = [...container.querySelectorAll("mark")].map((m) => [
      m.textContent,
      m.getAttribute("data-tone"),
      m.getAttribute("data-range-id"),
      m.className.includes(`bg-annotate-${m.getAttribute("data-tone")}`),
      m.hasAttribute("data-match-index"),
    ]);
    expect(found).toEqual([
      ["ship it", "green", "4", true, false],
      ["Monday", "pink", "9", true, false],
    ]);
    expect(container.textContent).toBe("ship it on Friday, review Monday");
  });

  test("search matches sit on top of highlights and keep their own index", () => {
    // Search for "it on" (index 0) inside a yellow highlight of "ship it on Friday".
    const ranges = [
      { start: 5, end: 10 },
      { start: 0, end: 17, tone: "yellow" as const, id: "h1" },
    ];
    expect(segment("ship it on Friday!", ranges)).toEqual([
      { text: "ship ", tone: 1 },
      { text: "it on", match: 0, tone: 1 },
      { text: " Friday", tone: 1 },
      { text: "!" },
    ]);
    const { container } = render(
      <Highlighter text="ship it on Friday!" ranges={ranges} activeIndex={0} />,
    );
    const current = container.querySelector('mark[aria-current="true"]');
    expect(current?.textContent).toBe("it on");
    expect(current?.className).toContain("bg-highlight-active");
    expect(current?.className).not.toContain("bg-annotate");
    // Still discoverable as part of the highlight, so clicking it can edit the highlight.
    expect(current?.getAttribute("data-range-id")).toBe("h1");
    expect(container.querySelectorAll('mark[data-range-id="h1"]')).toHaveLength(3);
  });

  test("overlapping highlights render each character once, the later one on top", () => {
    const segs = segment("abcdefgh", [
      { start: 1, end: 5, tone: "blue" },
      { start: 3, end: 7, tone: "pink" },
    ]);
    expect(segs).toEqual([
      { text: "a" },
      { text: "bc", tone: 0 },
      { text: "defg", tone: 1 },
      { text: "h" },
    ]);
  });

  test("a highlight nested inside an earlier one stays visible", () => {
    const text = "ship it on Friday please";
    const ranges = [
      { start: 0, end: 24, tone: "yellow" as const, id: 1 },
      { start: 11, end: 17, tone: "pink" as const, id: 2 },
    ];
    expect(segment(text, ranges)).toEqual([
      { text: "ship it on ", tone: 0 },
      { text: "Friday", tone: 1 },
      { text: " please", tone: 0 },
    ]);
    const { container } = render(<Highlighter text={text} ranges={ranges} />);
    expect(container.querySelector('mark[data-range-id="2"]')?.textContent).toBe("Friday");
  });

  test("saved highlights carry a screen-reader label without changing the text", () => {
    const { container } = render(
      <Highlighter text="ship it" ranges={[{ start: 0, end: 4, tone: "green", id: 1 }]} />,
    );
    const mark = container.querySelector("mark")!;
    expect(mark.getAttribute("data-sr-label")).toBe(" (highlighted green)");
    expect(mark.className).toContain("after:content-[attr(data-sr-label)]");
    // Selections are measured against textContent, so the label must not be a text node.
    expect(container.textContent).toBe("ship it");
  });

  test("no ranges renders plain text", () => {
    const { container } = render(<Highlighter text="plain" ranges={[]} />);
    expect(container.querySelector("mark")).toBeNull();
    expect(container.textContent).toBe("plain");
  });
});
