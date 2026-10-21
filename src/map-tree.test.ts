import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import { ancestors, deleteMap, linkObject, mapTree } from "./map-tree";
import { defaultSettings } from "./types";
import type { MapData, MapKind, Project } from "./types";

function map(id: string, kind: MapKind, parentId?: string): MapData {
  const m = createEmptyMap(kind, defaultSettings, id, id);
  m.parentId = parentId;
  m.objects = [
    {
      id: `${id}-stamp`,
      kind: "tavern",
      name: "Stamp",
      x: 10,
      y: 10,
      width: 20,
      height: 20,
      rotation: 0,
      layer: "Objects",
      color: "#000000",
    },
  ];
  return m;
}
const world = (maps: MapData[], activeMapId = maps[0].id): Project => ({
  version: 1,
  id: "w",
  name: "W",
  maps,
  activeMapId,
  credits: [],
  commercial: false,
  updatedAt: "",
});
const ids = (maps: MapData[]) => maps.map((m) => m.id);

describe("map tree", () => {
  const maps = [
    map("world", "world"),
    map("dungeon", "dungeon", "city"),
    map("city", "city", "world"),
    map("loose", "city"),
  ];

  it("lists the maps above a map, the top one first", () => {
    expect(ids(ancestors(maps, "dungeon"))).toEqual(["world", "city"]);
    expect(ancestors(maps, "world")).toEqual([]);
  });

  it("orders maps so each is followed by the maps below it", () => {
    expect(mapTree(maps).map((r) => [r.map.id, r.depth])).toEqual([
      ["world", 0],
      ["city", 1],
      ["dungeon", 2],
      ["loose", 0],
    ]);
  });

  it("survives a parent loop", () => {
    const loop = [map("a", "city", "b"), map("b", "city", "a")];
    expect(ids(ancestors(loop, "a"))).toEqual(["b"]);
    expect(mapTree(loop).map((r) => r.map.id)).toEqual(["a", "b"]);
  });

  it("links a stamp and places a map without a parent under it", () => {
    const next = linkObject(world(maps), "city", "city-stamp", "loose");
    const city = next.maps.find((m) => m.id === "city")!;
    expect(city.objects[0].linkedMap).toBe("loose");
    expect(next.maps.find((m) => m.id === "loose")!.parentId).toBe("city");
  });

  it("links a stamp back up the tree without making a loop", () => {
    const next = linkObject(world(maps), "dungeon", "dungeon-stamp", "world");
    expect(next.maps.find((m) => m.id === "world")!.parentId).toBeUndefined();
    expect(
      next.maps.find((m) => m.id === "dungeon")!.objects[0].linkedMap,
    ).toBe("world");
  });

  it("deletes a map, clears links to it and moves its maps up", () => {
    const linked = linkObject(
      world(maps, "city"),
      "world",
      "world-stamp",
      "city",
    );
    linked.maps.find((m) => m.id === "dungeon")!.parentPosition = {
      x: 1,
      y: 1,
    };
    const next = deleteMap(linked, "city");
    expect(ids(next.maps)).toEqual(["world", "dungeon", "loose"]);
    expect(next.maps[0].objects[0].linkedMap).toBeUndefined();
    expect(next.maps[1].parentId).toBe("world");
    expect(next.maps[1].parentPosition).toBeUndefined();
    expect(next.activeMapId).toBe("world");
  });

  it("keeps the last map", () => {
    const only = world([map("world", "world")]);
    expect(deleteMap(only, "world")).toBe(only);
  });
});
