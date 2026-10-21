import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import { eraseAt } from "./erase";
import type { MapObject, MapPath } from "./types";

const object = (
  id: string,
  x: number,
  extra: Partial<MapObject> = {},
): MapObject => ({
  id,
  kind: "tree",
  name: id,
  x,
  y: 100,
  width: 20,
  height: 20,
  rotation: 0,
  layer: "Objects",
  color: "#000",
  ...extra,
});
const path = (id: string, kind: MapPath["kind"], y: number): MapPath => ({
  id,
  kind,
  points: [
    { x: 0, y },
    { x: 200, y },
    { x: 400, y },
  ],
  width: 6,
  layer: "Water",
});
const all = () => true;

describe("eraser", () => {
  it("removes stamps and labels under the brush only", () => {
    const m = createEmptyMap("world");
    m.objects = [
      object("a", 100),
      object("b", 300),
      object("l", 110, { kind: "label" }),
    ];
    expect(eraseAt(m, { x: 105, y: 100 }, 10, all)).toBe(true);
    expect(m.objects.map((o) => o.id)).toEqual(["b"]);
  });
  it("removes a river, road or wall whole when touching any part", () => {
    const m = createEmptyMap("world");
    m.paths = [
      path("r", "river", 50),
      path("w", "wall", 300),
      path("b", "border", 52),
    ];
    eraseAt(m, { x: 390, y: 55 }, 5, all);
    expect(m.paths.map((p) => p.id)).toEqual(["w", "b"]);
  });
  it("leaves locked layers and linked settlements alone", () => {
    const m = createEmptyMap("world");
    m.objects = [
      object("a", 100),
      object("city", 100, { kind: "city", linkedMap: "x" }),
    ];
    m.paths = [path("r", "river", 100)];
    expect(
      eraseAt(
        m,
        { x: 100, y: 100 },
        10,
        (l) => l !== "Objects" && l !== "Water",
      ),
    ).toBe(false);
    eraseAt(m, { x: 100, y: 100 }, 10, all);
    expect(m.objects.map((o) => o.id)).toEqual(["city"]);
    expect(m.paths).toEqual([]);
  });
});
