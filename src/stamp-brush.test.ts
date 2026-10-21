import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import {
  spriteFromStamp,
  spriteSize,
  trailSpacing,
  withStampCredits,
} from "./stamp-brush";
import { isScatterSprite } from "./symbols";
import { defaultSettings } from "./types";
import type { MapObject, Project } from "./types";

const banner: MapObject = {
  id: "my1",
  kind: "image",
  name: "Red banner",
  image: "data:image/png;base64,iVBORw0KGgo=",
  x: 0,
  y: 0,
  width: 80,
  height: 40,
  rotation: 0,
  layer: "Objects",
  color: "#000000",
  creditId: "c1",
};
const credit = {
  id: "c1",
  name: "Red banner",
  author: "Ann",
  license: "CC0",
  url: "https://example.com",
};

describe("stamp brush", () => {
  it("uses a stamp from My stamps as the sprite, with its shape and credit", () => {
    expect(spriteFromStamp(banner, credit)).toEqual({
      src: banner.image,
      name: "Red banner",
      aspect: 2,
      credit,
    });
  });

  it("keeps an imported stamp's shape", () => {
    expect(spriteSize(spriteFromStamp(banner), 60)).toEqual({
      width: 60,
      height: 30,
    });
    expect(
      spriteSize(spriteFromStamp({ ...banner, width: 20, height: 40 }), 60),
    ).toEqual({ width: 30, height: 60 });
    expect(
      spriteSize({ src: "/assets/cartography/castle.png", name: "c" }, 50),
    ).toEqual({ width: 50, height: 50 });
  });

  it("draws imported stamps and trees along a drag, other sprites once", () => {
    expect(trailSpacing(spriteFromStamp(banner), 50)).toBe(40);
    expect(
      trailSpacing({ src: "/assets/cartography/treePine.png", name: "t" }, 50),
    ).toBe(22.5);
    expect(
      trailSpacing({ src: "/assets/cartography/castle.png", name: "c" }, 50),
    ).toBeUndefined();
    expect(trailSpacing(undefined, 50)).toBeUndefined();
  });

  it("never mistakes an image's data for a tree path", () => {
    // Base64 data can contain "/Tree" by chance.
    expect(isScatterSprite("data:image/png;base64,AAAA/TreeBBBB")).toBe(false);
    expect(isScatterSprite("/assets/cartography/treePine.png")).toBe(true);
  });

  it("adds an imported stamp's credit once a copy is on the map", () => {
    const map = createEmptyMap("world", defaultSettings);
    const project: Project = {
      version: 1,
      id: "w",
      name: "W",
      maps: [map],
      activeMapId: map.id,
      credits: [],
      commercial: false,
      updatedAt: "",
    };
    expect(withStampCredits(project, map, [credit])).toBe(project);
    const placed = { ...map, objects: [banner] };
    expect(withStampCredits(project, placed, [credit]).credits).toEqual([
      credit,
    ]);
    const credited = { ...project, credits: [credit] };
    expect(withStampCredits(credited, placed, [credit])).toBe(credited);
  });
});

describe("sprites that fill dungeon grid squares", () => {
  const bed = { src: "/assets/gosbell/bed.png", name: "Bed", cells: [1, 2] as [number, number] };

  it("are drawn to their squares on a dungeon, scaled by the brush size", () => {
    expect(spriteSize(bed, 48, 25)).toEqual({ width: 25, height: 50 });
    expect(spriteSize(bed, 96, 25)).toEqual({ width: 50, height: 100 });
  });

  it("follow the brush size on maps without a dungeon grid", () => {
    expect(spriteSize({ ...bed, aspect: 0.5 }, 60)).toEqual({
      width: 30,
      height: 60,
    });
  });
});
