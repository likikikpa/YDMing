import { expect, it } from "vitest";
import { removeBackgroundPixels } from "./assets";
it("preserves black line art that already has transparent edges", () => {
  const pixels = new Uint8ClampedArray(5 * 5 * 4);
  pixels.set([0, 0, 0, 255], (2 * 5 + 2) * 4);
  removeBackgroundPixels(pixels, 5, 5, 18);
  expect(pixels[(2 * 5 + 2) * 4 + 3]).toBe(255);
});
it("removes only the edge-connected white background, retaining white inside an ink outline", () => {
  const pixels = new Uint8ClampedArray(7 * 7 * 4).fill(255);
  for (let y = 2; y <= 4; y++)
    for (let x = 2; x <= 4; x++)
      if (x === 2 || x === 4 || y === 2 || y === 4)
        pixels.set([0, 0, 0, 255], (y * 7 + x) * 4);
  removeBackgroundPixels(pixels, 7, 7, 12);
  expect(pixels[3]).toBe(0);
  expect(pixels[(3 * 7 + 3) * 4 + 3]).toBe(255);
  expect(pixels[(2 * 7 + 2) * 4 + 3]).toBe(255);
});
