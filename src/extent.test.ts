import { describe, expect, it } from "vitest";
import { extent, objectBounds } from "./extent";
import type { MapObject } from "./types";

const stamp = (x: number, y: number, size = 10): MapObject => ({
  id: `${x}-${y}`,
  kind: "tower",
  name: "s",
  x,
  y,
  width: size,
  height: size,
  rotation: 0,
  layer: "Objects",
  color: "#000000",
});

describe("extent", () => {
  it("finds the smallest and largest value", () => {
    expect(extent([3, -2, 9, 4])).toEqual({ min: -2, max: 9 });
  });
  it("handles more values than a function call can take", () => {
    // Math.min(...values) throws a RangeError from about 120,000 values.
    const values = Array.from({ length: 500_000 }, (_, i) => i - 100);
    expect(() => Math.min(...values)).toThrow(RangeError);
    expect(extent(values)).toEqual({ min: -100, max: 499_899 });
  });
});

describe("objectBounds", () => {
  it("is the box around the objects", () => {
    expect(objectBounds([stamp(10, 20), stamp(50, 40, 20)])).toEqual({
      left: 5,
      top: 15,
      right: 60,
      bottom: 50,
    });
  });
  it("handles a very large selection", () => {
    const objects = Array.from({ length: 300_000 }, (_, i) => stamp(i, i));
    expect(objectBounds(objects)).toEqual({
      left: -5,
      top: -5,
      right: 299_999 + 5,
      bottom: 299_999 + 5,
    });
  });
});
