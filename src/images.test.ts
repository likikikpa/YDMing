import { describe, expect, it } from "vitest";
import { createEmptyMap } from "./generator";
import {
  imageId,
  imageSources,
  migrateImages,
  objectImage,
  pruneImages,
  withImages,
} from "./images";
import { validateProject } from "./storage";
import { defaultSettings } from "./types";
import type { MapObject, Project } from "./types";

const PNG = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA";
const OTHER = "data:image/png;base64,R0lGODlhAQABAIAAAAAAAP///yH5";
const stamp = (id: string, extra: Partial<MapObject> = {}): MapObject => ({
  id,
  kind: "image",
  name: id,
  x: 10,
  y: 10,
  width: 20,
  height: 20,
  rotation: 0,
  layer: "Objects",
  color: "#000000",
  ...extra,
});
function world(objects: MapObject[], images?: Record<string, string>): Project {
  const map = createEmptyMap("world", defaultSettings, "M", "m");
  map.objects = objects;
  return {
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
}

describe("image ids", () => {
  it("are the same for the same picture and differ for another", () => {
    expect(imageId(PNG)).toBe(imageId(`${PNG}`));
    expect(imageId(PNG)).not.toBe(imageId(OTHER));
    expect(imageId(PNG)).toMatch(/^i[0-9a-z]+-[0-9a-z]+$/);
  });
  it("tell apart pictures that differ by one character or only in length", () => {
    expect(imageId(PNG)).not.toBe(imageId(PNG.slice(0, -1) + "B"));
    expect(imageId(PNG)).not.toBe(imageId(PNG + "A"));
  });
});

describe("migrating embedded images", () => {
  it("stores each distinct picture once and leaves stamps with its id", () => {
    const p = world([
      ...Array.from({ length: 50 }, (_, i) => stamp(`a${i}`, { image: PNG })),
      stamp("b", { image: OTHER }),
      stamp("kenney", { image: "/assets/cartography/castle.png" }),
      stamp("plain", { kind: "tower" }),
    ]);
    const next = migrateImages(p);
    const id = imageId(PNG);
    expect(Object.keys(next.images!).sort()).toEqual(
      [id, imageId(OTHER)].sort(),
    );
    expect(next.images![id]).toBe(PNG);
    const objects = next.maps[0].objects;
    expect(objects.filter((o) => o.imageId === id)).toHaveLength(50);
    expect(objects.every((o) => !o.image?.startsWith("data:"))).toBe(true);
    // Bundled sprites and plain stamps are untouched.
    expect(objects.find((o) => o.id === "kenney")!.image).toBe(
      "/assets/cartography/castle.png",
    );
    expect(objects.find((o) => o.id === "plain")).toEqual(
      p.maps[0].objects.find((o) => o.id === "plain"),
    );
    // The input is not changed.
    expect(p.maps[0].objects[0].image).toBe(PNG);
  });

  it("returns the same project when nothing is embedded, and is idempotent", () => {
    const clean = world([stamp("a", { image: "/assets/medieval/x.png" })]);
    expect(migrateImages(clean)).toBe(clean);
    const once = migrateImages(world([stamp("a", { image: PNG })]));
    expect(migrateImages(once)).toBe(once);
  });

  it("keeps the pictures of other maps and an existing table", () => {
    const p = world([stamp("a", { image: PNG })], { keep: OTHER });
    const second = createEmptyMap("city", defaultSettings, "C", "c");
    second.objects = [
      stamp("c1", { image: PNG }),
      stamp("c2", { imageId: "keep" }),
    ];
    p.maps.push(second);
    const next = migrateImages(p);
    expect(next.images!.keep).toBe(OTHER);
    expect(next.maps[1].objects[0].imageId).toBe(imageId(PNG));
    expect(next.maps[1].objects[1].imageId).toBe("keep");
  });

  it("makes a world of thousands of copies small", () => {
    const big = "data:image/png;base64," + "A".repeat(100_000);
    const p = world(
      Array.from({ length: 3000 }, (_, i) => stamp(`s${i}`, { image: big })),
    );
    const before = JSON.stringify(p).length;
    const next = migrateImages(p);
    const after = JSON.stringify(next).length;
    expect(before).toBeGreaterThan(300_000_000);
    expect(after).toBeLessThan(1_000_000);
    expect(Object.keys(next.images!)).toHaveLength(1);
    // Editing copies the map, not the picture.
    const copy = structuredClone(next.maps[0]);
    expect(JSON.stringify(copy).length).toBeLessThan(1_000_000);
  });
});

describe("the table at work", () => {
  it("finds what a stamp shows", () => {
    const table = { x: PNG };
    expect(objectImage(stamp("a", { imageId: "x" }), table)).toBe(PNG);
    expect(objectImage(stamp("a", { image: "/assets/a.png" }), table)).toBe(
      "/assets/a.png",
    );
    expect(objectImage(stamp("a", { imageId: "gone" }), table)).toBeUndefined();
  });

  it("lists each distinct picture once", () => {
    const table = { x: PNG };
    const sources = imageSources(
      [
        stamp("a", { imageId: "x" }),
        stamp("b", { imageId: "x" }),
        stamp("c", { image: "/assets/a.png" }),
        stamp("d", { kind: "tower" }),
        stamp("e", { imageId: "gone" }),
      ],
      table,
    );
    expect([...sources]).toEqual([PNG, "/assets/a.png"]);
  });

  it("drops pictures no stamp uses, for saving", () => {
    const p = world([stamp("a", { imageId: "x" })], { x: PNG, unused: OTHER });
    expect(pruneImages(p).images).toEqual({ x: PNG });
    const all = world([stamp("a", { imageId: "x" })], { x: PNG });
    expect(pruneImages(all)).toBe(all);
    const none = pruneImages(world([stamp("a")], { x: PNG }));
    expect("images" in none).toBe(false);
  });

  it("adds a picture to the table once a stamp uses it", () => {
    const p = world([stamp("a", { imageId: "x" })]);
    const next = withImages(p, p.maps[0], { x: PNG, y: OTHER });
    expect(next.images).toEqual({ x: PNG });
    expect(withImages(next, next.maps[0], { x: PNG })).toBe(next);
  });
});

describe("files with an image table", () => {
  it("round-trips through validation", () => {
    const p = world([stamp("a", { imageId: "x" })], { x: PNG });
    expect(validateProject(JSON.parse(JSON.stringify(p)))).toEqual(p);
  });
  it("rejects a stamp whose picture is missing", () => {
    const p = world([stamp("a", { imageId: "gone" })], { x: PNG });
    expect(() => validateProject(p)).toThrow(/image/i);
    expect(() =>
      validateProject(world([stamp("a", { imageId: "x" })])),
    ).toThrow(/image/i);
  });
  it("rejects a table with something other than embedded pictures", () => {
    const bad = (images: unknown) =>
      world([stamp("a")], images as Record<string, string>);
    expect(() =>
      validateProject(bad({ x: "https://example.com/a.png" })),
    ).toThrow(/image/i);
    expect(() => validateProject(bad({ x: "javascript:alert(1)" }))).toThrow(
      /image/i,
    );
    expect(() => validateProject(bad({ "bad key": PNG }))).toThrow(/image/i);
    expect(() => validateProject(bad([PNG]))).toThrow(/image/i);
  });
  it("still opens a file that embeds the picture in each stamp", () => {
    const old = world([stamp("a", { image: PNG })]);
    expect(validateProject(JSON.parse(JSON.stringify(old)))).toEqual(old);
  });
});
