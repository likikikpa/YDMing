import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import {
  spriteFromStamp,
  spriteSize,
  trailSpacing,
  imagesWithSprite,
  spriteAssets,
  spriteImage,
  withStampAssets,
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
      imageId: expect.stringMatching(/^i/),
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
    const assets = { credits: [credit] };
    expect(withStampAssets(project, map, assets)).toBe(project);
    const placed = { ...map, objects: [banner] };
    expect(withStampAssets(project, placed, assets).credits).toEqual([credit]);
    const credited = { ...project, credits: [credit] };
    expect(withStampAssets(credited, placed, assets)).toBe(credited);
  });

  describe("pictures", () => {
    const sprite = spriteFromStamp(banner, credit);
    const world = (objects: MapObject[], images?: Record<string, string>) => {
      const map = { ...createEmptyMap("world", defaultSettings), objects };
      const project: Project = {
        version: 1,
        id: "w",
        name: "W",
        maps: [map],
        activeMapId: map.id,
        credits: [],
        commercial: false,
        updatedAt: "",
        ...(images && { images }),
      };
      return { project, map };
    };

    it("gives an imported stamp a picture id, and a bundled sprite none", () => {
      expect(sprite.imageId).toMatch(/^i/);
      expect(sprite.imageId).toBe(spriteFromStamp(banner).imageId);
      const bundled = { src: "/assets/cartography/castle.png", name: "c" };
      expect(spriteFromStamp({ ...banner, image: bundled.src }).imageId).toBe(
        undefined,
      );
    });

    it("places a copy that names the picture instead of holding it", () => {
      expect(spriteImage(sprite)).toEqual({ imageId: sprite.imageId });
      expect(
        spriteImage({ src: "/assets/cartography/castle.png", name: "c" }),
      ).toEqual({ image: "/assets/cartography/castle.png" });
    });

    it("adds the picture to the world with the first placed copy, once", () => {
      const copy = {
        ...banner,
        id: "copy",
        image: undefined,
        imageId: sprite.imageId,
      };
      const empty = world([]);
      expect(
        withStampAssets(empty.project, empty.map, spriteAssets(sprite)),
      ).toBe(empty.project);
      const placed = world([copy]);
      const next = withStampAssets(
        placed.project,
        placed.map,
        spriteAssets(sprite),
      );
      expect(next.images).toEqual({ [sprite.imageId!]: banner.image });
      expect(next.credits).toEqual([credit]);
      expect(withStampAssets(next, next.maps[0], spriteAssets(sprite))).toBe(
        next,
      );
    });

    it("shows the picture while the stamp is being drawn", () => {
      expect(imagesWithSprite(undefined, sprite)).toEqual({
        [sprite.imageId!]: banner.image,
      });
      const table = { [sprite.imageId!]: banner.image! };
      expect(imagesWithSprite(table, sprite)).toBe(table);
      expect(imagesWithSprite(undefined, undefined)).toBeUndefined();
      expect(imagesWithSprite(table, { src: "/assets/a.png", name: "a" })).toBe(
        table,
      );
    });
  });
});
