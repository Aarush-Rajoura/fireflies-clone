import { describe, expect, it } from "vitest";

import { fraction, intensityLevel, labelStride, linearScale, niceTicks } from "./scale";

describe("linearScale", () => {
  it("maps the domain onto the range, including inverted ranges", () => {
    const y = linearScale([0, 10], [200, 0]);
    expect(y(0)).toBe(200);
    expect(y(5)).toBe(100);
    expect(y(10)).toBe(0);
  });

  it("maps a zero-width domain to the range start instead of NaN", () => {
    expect(linearScale([3, 3], [0, 100])(3)).toBe(0);
  });
});

describe("niceTicks", () => {
  it("uses round integer steps that cover the max", () => {
    expect(niceTicks(3)).toEqual([0, 1, 2, 3]);
    expect(niceTicks(7)).toEqual([0, 2, 4, 6, 8]);
    expect(niceTicks(10)).toEqual([0, 5, 10]);
    expect(niceTicks(23)).toEqual([0, 10, 20, 30]);
  });

  it("gives an all-zero series a real axis", () => {
    expect(niceTicks(0)).toEqual([0, 1]);
  });

  it("allows fractional steps when asked", () => {
    expect(niceTicks(1, 4, { integer: false })).toEqual([0, 0.5, 1]);
  });
});

describe("labelStride", () => {
  it("labels every slot when they fit", () => {
    expect(labelStride(5, 8)).toBe(1);
  });

  it("thins labels to at most the limit", () => {
    expect(labelStride(39, 8)).toBe(5);
    expect(Math.ceil(39 / labelStride(39, 8))).toBeLessThanOrEqual(8);
  });

  it("survives degenerate limits", () => {
    expect(labelStride(0, 8)).toBe(1);
    expect(labelStride(10, 0)).toBe(10);
  });
});

describe("intensityLevel", () => {
  it("keeps zero at level 0 and any activity at level 1 or more", () => {
    expect(intensityLevel(0, 10)).toBe(0);
    expect(intensityLevel(1, 100)).toBe(1);
    expect(intensityLevel(10, 10)).toBe(4);
    expect(intensityLevel(5, 10)).toBe(2);
  });

  it("is 0 when there is nothing at all", () => {
    expect(intensityLevel(0, 0)).toBe(0);
  });
});

describe("fraction", () => {
  it("clamps to 0..1", () => {
    expect(fraction(5, 10)).toBe(0.5);
    expect(fraction(20, 10)).toBe(1);
    expect(fraction(3, 0)).toBe(0);
    expect(fraction(-1, 10)).toBe(0);
  });
});
