import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { resolveRange, resolveSelection } from "./selection";

/*
 * The same shape the transcript renders: a row with a speaker header, then a
 * <p data-segment-text> whose text may be split by <mark>s (search, highlights).
 */
function mount(): HTMLElement {
  document.body.innerHTML = `
    <section id="outside"><p>Summary text</p></section>
    <div id="scope">
      <div data-row="1">
        <div class="header"><span>Sarah</span> <span>0:00</span></div>
        <p data-segment-text="101"><span>Welcome <mark data-range-id="9">everyone</mark> to the kickoff.</span></p>
      </div>
      <div data-row="2">
        <div class="header"><span>Janice</span></div>
        <p data-segment-text="102"><span>Café 😀 pricing is fine.</span></p>
      </div>
    </div>`;
  return document.getElementById("scope")!;
}

const text = (selector: string) => {
  const el = document.querySelector(selector)!;
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  const nodes: Text[] = [];
  while (walker.nextNode()) nodes.push(walker.currentNode as Text);
  return nodes;
};

function range(startNode: Node, startOffset: number, endNode: Node, endOffset: number): Range {
  const r = document.createRange();
  r.setStart(startNode, startOffset);
  r.setEnd(endNode, endOffset);
  return r;
}

describe("resolveRange", () => {
  let scope: HTMLElement;
  beforeEach(() => {
    scope = mount();
  });
  afterEach(() => {
    document.body.innerHTML = "";
  });

  it("maps a selection inside one text node to string offsets", () => {
    const [welcome] = text('[data-segment-text="101"]');
    expect(resolveRange(range(welcome!, 0, welcome!, 7), scope)).toEqual({
      kind: "segment",
      segmentId: 101,
      start: 0,
      end: 7,
      text: "Welcome",
    });
  });

  it("counts across <mark> boundaries using the segment's full text", () => {
    const [, everyone, rest] = text('[data-segment-text="101"]');
    // "everyone to" spans the highlight mark and the following text node.
    const got = resolveRange(range(everyone!, 0, rest!, 3), scope);
    expect(got).toEqual({ kind: "segment", segmentId: 101, start: 8, end: 19, text: "everyone to" });
    expect("Welcome everyone to the kickoff.".slice(8, 19)).toBe("everyone to");
  });

  it("measures in UTF-16 code units, like JavaScript string indices", () => {
    const [node] = text('[data-segment-text="102"]');
    const source = "Café 😀 pricing is fine.";
    const at = source.indexOf("pricing");
    const got = resolveRange(range(node!, at, node!, at + "pricing".length), scope);
    expect(got).toMatchObject({ start: at, end: at + 7, text: "pricing" });
    expect(at).toBe(8); // the emoji counts as two
  });

  it("trims surrounding whitespace off the selection", () => {
    const [welcome] = text('[data-segment-text="101"]');
    expect(resolveRange(range(welcome!, 7, welcome!, 8), scope)).toEqual({ kind: "none" });
    const [, everyone, rest] = text('[data-segment-text="101"]');
    expect(resolveRange(range(everyone!, 0, rest!, 1), scope)).toMatchObject({
      start: 8,
      end: 16,
      text: "everyone",
    });
  });

  it("rejects a selection with text in two lines", () => {
    const [, , rest] = text('[data-segment-text="101"]');
    const [cafe] = text('[data-segment-text="102"]');
    expect(resolveRange(range(rest!, 5, cafe!, 4), scope)).toEqual({ kind: "cross-segment" });
  });

  it("accepts a triple-click that ends at the very start of the next row", () => {
    const p = document.querySelector('[data-segment-text="101"]')!;
    const nextRow = document.querySelector('[data-row="2"]')!;
    expect(resolveRange(range(p, 0, nextRow, 0), scope)).toMatchObject({
      segmentId: 101,
      start: 0,
      end: 32,
      text: "Welcome everyone to the kickoff.",
    });
  });

  it("accepts a drag that starts on the speaker name and ends inside the text", () => {
    const [name] = text('[data-row="2"] .header');
    const [cafe] = text('[data-segment-text="102"]');
    expect(resolveRange(range(name!, 2, cafe!, 4), scope)).toMatchObject({
      segmentId: 102,
      start: 0,
      end: 4,
      text: "Café",
    });
  });

  it("ignores selections outside the transcript or without line text", () => {
    const [summary] = text("#outside");
    expect(resolveRange(range(summary!, 0, summary!, 7), scope)).toEqual({ kind: "none" });
    const [name] = text('[data-row="1"] .header');
    expect(resolveRange(range(name!, 0, name!, 5), scope)).toEqual({ kind: "none" });
    // From the summary into a line is not a transcript selection either.
    const [welcome] = text('[data-segment-text="101"]');
    expect(resolveRange(range(summary!, 0, welcome!, 3), scope)).toEqual({ kind: "none" });
  });
});

describe("resolveSelection", () => {
  it("reads the live document selection", () => {
    const scope = mount();
    const [welcome] = text('[data-segment-text="101"]');
    const selection = window.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range(welcome!, 8, welcome!, 8));
    expect(resolveSelection(selection, scope)).toEqual({ kind: "none" });
    selection.removeAllRanges();
    selection.addRange(range(welcome!, 0, welcome!, 7));
    expect(resolveSelection(selection, scope)).toMatchObject({ segmentId: 101, text: "Welcome" });
    selection.removeAllRanges();
    document.body.innerHTML = "";
  });
});
