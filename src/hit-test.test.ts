import { expect, it } from "vitest";
import { hitObject, navigationTarget } from "./hit-test";
import type { MapObject } from "./types";
const pin: MapObject = {
  id: "pin",
  kind: "city",
  name: "City",
  x: 100,
  y: 100,
  width: 20,
  height: 20,
  rotation: 0,
  layer: "Objects",
  color: "#000000",
};
it("opens the settlement pin even when a large regional label overlaps it", () => {
  const label = {
    ...pin,
    id: "label",
    kind: "label" as const,
    width: 300,
    height: 14,
  };
  expect(navigationTarget([pin, label], { x: 100, y: 100 })).toBe(pin);
  expect(navigationTarget([label], { x: 100, y: 145 })).toBeUndefined();
});
it("hit-tests the actual rotated object rectangle", () => {
  const object = { ...pin, width: 100, height: 10, rotation: 90 };
  expect(hitObject(object, { x: 100, y: 140 }, 0)).toBe(true);
  expect(hitObject(object, { x: 140, y: 100 }, 0)).toBe(false);
});
