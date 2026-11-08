import { describe, expect, it } from "vitest";
import { generateMap } from "./generator";
import { editedCopy } from "./map-edit";
import { defaultSettings } from "./types";

const map = () =>
  generateMap("world", { ...defaultSettings, seed: "edit1", detail: 0 });

describe("editedCopy", () => {
  it("keeps the ground arrays when only an object changes, so the terrain is not repainted", () => {
    const m = map();
    m.objects.push({
      id: "l",
      kind: "label",
      x: 5,
      y: 5,
      name: "A",
      width: 100,
      height: 20,
      rotation: 0,
      layer: "Labels",
      color: "#000000",
    });
    const next = editedCopy(m, (c) => {
      c.objects.find((o) => o.id === "l")!.name = "AB";
    });
    expect(next.heights).toBe(m.heights);
    expect(next.biomes).toBe(m.biomes);
    expect(next.materials).toBe(m.materials);
    expect(next.objects.find((o) => o.id === "l")!.name).toBe("AB");
  });

  it("never changes the map it copies, and shares no object with it", () => {
    const m = map();
    const before = JSON.stringify(m);
    const next = editedCopy(m, (c) => {
      c.name = "Other";
      c.settings.seed = "changed";
    });
    expect(JSON.stringify(m)).toBe(before);
    expect(next.settings).not.toBe(m.settings);
    expect(next.objects).not.toBe(m.objects);
  });

  it("gives arrays of its own to a change that edits the ground", () => {
    const m = map();
    const was = m.heights[10];
    const next = editedCopy(m, (c) => {
      c.heights[10] = was + 0.25;
      c.biomes[11] = (c.biomes[11] + 1) % 5;
    });
    expect(next.heights).not.toBe(m.heights);
    expect(next.biomes).not.toBe(m.biomes);
    expect(m.heights[10]).toBe(was);
    expect(next.heights[10]).toBe(was + 0.25);
  });

  it("still repaints when a change replaces the arrays to ask for it", () => {
    const m = map();
    const next = editedCopy(m, (c) => {
      c.heights = c.heights.slice();
    });
    expect(next.heights).not.toBe(m.heights);
    expect(next.heights).toEqual(m.heights);
  });

  it("keeps working for a map without materials", () => {
    const m = map();
    delete m.materials;
    const next = editedCopy(m, (c) => {
      c.name = "x";
    });
    expect(next.materials).toBeUndefined();
  });

  it("gives materials of their own when a change edits them", () => {
    const m = map();
    m.materials = new Array(m.heights.length).fill(0);
    const next = editedCopy(m, (c) => {
      c.materials![3] = 1;
    });
    expect(next.materials).not.toBe(m.materials);
    expect(m.materials[3]).toBe(0);
  });
});
