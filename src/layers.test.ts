import { describe, expect, it } from "vitest";
import { moveLayer, placeLayer } from "./layers";
import { makeLayers } from "./types";

const ids = (layers: { id: string }[]) => layers.map((l) => l.id);

describe("layer order", () => {
  it("moves a layer up and down one step", () => {
    const layers = makeLayers();
    expect(moveLayer(layers, "Paint", 1)).toBe(true);
    expect(ids(layers)).toEqual(["Terrain", "Water", "Objects", "Paint", "Labels", "Grid", "GM-only"]);
    expect(moveLayer(layers, "Paint", -1)).toBe(true);
    expect(ids(layers)).toEqual(ids(makeLayers()));
  });
  it("never moves Terrain or Grid, and steps over them", () => {
    const layers = makeLayers();
    expect(moveLayer(layers, "Terrain", 1)).toBe(false);
    expect(moveLayer(layers, "Grid", -1)).toBe(false);
    expect(moveLayer(layers, "Water", -1)).toBe(false);
    expect(moveLayer(layers, "Labels", 1)).toBe(true);
    expect(ids(layers)).toEqual(["Terrain", "Water", "Paint", "Objects", "GM-only", "Grid", "Labels"]);
  });
  it("drops a layer onto another layer's place", () => {
    const layers = makeLayers();
    expect(placeLayer(layers, "Water", "Labels")).toBe(true);
    expect(ids(layers)).toEqual(["Terrain", "Paint", "Objects", "Labels", "Water", "Grid", "GM-only"]);
    expect(placeLayer(layers, "Water", "Terrain")).toBe(false);
  });
});
