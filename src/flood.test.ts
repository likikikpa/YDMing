import { expect, it } from "vitest";
import { floodFill } from "./flood";
it("fills only the connected region and respects an opaque boundary", () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  for (let y = 0; y < 5; y++) pixels.set([20, 20, 20, 255], (y * 5 + 2) * 4);
  floodFill(pixels, 5, 5, 0, 0, [140, 90, 30, 255]);
  expect(Array.from(pixels.slice(0, 4))).toEqual([140, 90, 30, 255]);
  expect(
    Array.from(pixels.slice((4 * 5 + 1) * 4, (4 * 5 + 1) * 4 + 4)),
  ).toEqual([140, 90, 30, 255]);
  expect(Array.from(pixels.slice(3 * 4, 4 * 4))).toEqual([0, 0, 0, 0]);
  expect(Array.from(pixels.slice(2 * 4, 3 * 4))).toEqual([20, 20, 20, 255]);
});
