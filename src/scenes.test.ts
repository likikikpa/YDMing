import { describe, expect, it } from "vitest";
import { pasteClip } from "./clipboard";
import { builtinScenes, validScene } from "./scenes";
import type { MapData, Project } from "./types";

const map = (kind: MapData["kind"], cols = 48) =>
  ({
    id: "m",
    kind,
    width: 1200,
    height: 850,
    cols,
    rows: 34,
    objects: [],
    paths: [],
    layers: [{ id: "Objects" }, { id: "GM-only" }],
  }) as unknown as MapData;

describe("built-in scenes", () => {
  it("offers overland scenes on worlds and cities and room scenes on dungeons", () => {
    const names = (kind: MapData["kind"]) =>
      builtinScenes(map(kind)).map((s) => s.name);
    expect(names("world")).toContain("Hamlet");
    expect(names("city")).toContain("Crossroads inn");
    expect(names("dungeon")).toContain("Pillared hall");
    expect(names("world")).not.toContain("Pillared hall");
    expect(names("dungeon")).not.toContain("Hamlet");
  });

  it("scales dungeon scenes to the map's cell size", () => {
    const small = builtinScenes(map("dungeon", 48)).find(
      (s) => s.id === "treasure-vault",
    )!;
    const large = builtinScenes(map("dungeon", 24)).find(
      (s) => s.id === "treasure-vault",
    )!;
    // 1200 / 48 = 25 px a cell; 1200 / 24 = 50.
    expect(small.clip.objects[0].width).toBeCloseTo(0.7 * 25);
    expect(large.clip.objects[0].width).toBeCloseTo(0.7 * 50);
  });

  it("keeps GM-only things such as traps on the GM-only layer", () => {
    const vault = builtinScenes(map("dungeon")).find(
      (s) => s.id === "treasure-vault",
    )!;
    expect(vault.clip.objects.find((o) => o.kind === "trap")!.layer).toBe(
      "GM-only",
    );
    expect(vault.clip.objects.find((o) => o.kind === "chest")!.layer).toBe(
      "Objects",
    );
  });

  it("draws roads heavier on cities than on worlds", () => {
    const road = (kind: MapData["kind"]) =>
      builtinScenes(map(kind)).find((s) => s.id === "crossroads-inn")!.clip
        .paths[0].width;
    expect(road("city")).toBeGreaterThan(road("world"));
  });

  it("places around the point it is dropped on, each time with new ids", () => {
    const m = map("world");
    const project = { maps: [m], credits: [] } as unknown as Project;
    const scene = builtinScenes(m).find((s) => s.id === "hamlet")!;
    const first = pasteClip(project, m, scene.clip, { x: 500, y: 300 });
    const placed = first.project.maps[0];
    expect(placed.objects).toHaveLength(scene.clip.objects.length);
    const xs = placed.objects.map((o) => o.x);
    expect(Math.min(...xs)).toBeGreaterThan(400);
    expect(Math.max(...xs)).toBeLessThan(600);
    const second = pasteClip(first.project, placed, scene.clip, {
      x: 900,
      y: 300,
    });
    const ids = second.project.maps[0].objects.map((o) => o.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("stored scenes", () => {
  const good = builtinScenes(map("world"))[0];

  it("accepts a scene the app wrote", () => {
    expect(validScene(good)).toBe(true);
  });

  it("rejects damaged scenes", () => {
    expect(validScene(null)).toBe(false);
    expect(validScene({ ...good, clip: undefined })).toBe(false);
    expect(validScene({ ...good, clip: { ...good.clip, centre: {} } })).toBe(
      false,
    );
    expect(validScene({ ...good, id: 4 })).toBe(false);
  });
});
