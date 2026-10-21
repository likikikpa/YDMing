import { describe, expect, it } from "vitest";
import { copySelection, pasteClip, removeSelection } from "./clipboard";
import { createEmptyMap } from "./generator";
import { hitPath, movedPath, nearestPath, pathInBox } from "./path-select";
import { defaultSettings } from "./types";
import type { MapData, MapObject, MapPath, Project } from "./types";

const stamp = (id: string, x: number, y: number, extra = {}): MapObject => ({
  id,
  kind: "tower",
  name: id,
  x,
  y,
  width: 20,
  height: 20,
  rotation: 0,
  layer: "Objects",
  color: "#000000",
  ...extra,
});
const river: MapPath = {
  id: "r",
  kind: "river",
  points: [
    { x: 0, y: 100 },
    { x: 100, y: 100 },
    { x: 100, y: 200 },
  ],
  width: 10,
  layer: "Water",
};
function setup(): { project: Project; map: MapData; other: MapData } {
  const map = createEmptyMap("world", defaultSettings, "Map", "m");
  map.objects = [
    stamp("a", 40, 40, { group: "g", creditId: "c1" }),
    stamp("b", 80, 40, { group: "g", linkedMap: "city" }),
    stamp("c", 300, 300),
  ];
  map.paths = [structuredClone(river)];
  const other = createEmptyMap("dungeon", defaultSettings, "Other", "o");
  const project: Project = {
    version: 1,
    id: "w",
    name: "W",
    maps: [map, other],
    activeMapId: map.id,
    credits: [
      {
        id: "c1",
        name: "Tower",
        author: "Ann",
        license: "CC0",
        url: "https://example.com",
      },
    ],
    commercial: false,
    updatedAt: "",
  };
  return { project, map, other };
}

describe("selecting paths", () => {
  it("hits a path along its line, not beside it", () => {
    expect(hitPath(river, { x: 50, y: 104 })).toBe(true);
    expect(hitPath(river, { x: 100, y: 150 })).toBe(true);
    expect(hitPath(river, { x: 50, y: 130 })).toBe(false);
  });
  it("picks the nearest path, not the last one drawn", () => {
    const branch: MapPath = {
      ...river,
      id: "branch",
      points: [
        { x: 50, y: 106 },
        { x: 50, y: 160 },
      ],
      width: 2,
    };
    // The point is on the main river and within reach of the branch's end;
    // the branch is drawn last, so picking the topmost would take it.
    expect(
      nearestPath([river, branch], { x: 50, y: 101 }, 8, () => true)?.id,
    ).toBe("r");
    expect(
      nearestPath([river, branch], { x: 50, y: 150 }, 8, () => true)?.id,
    ).toBe("branch");
    // A river on a locked layer leaves the branch to be picked.
    expect(
      nearestPath([river, branch], { x: 50, y: 101 }, 8, (p) => p.id !== "r")
        ?.id,
    ).toBe("branch");
  });
  it("takes a path in a marquee only when all of it is inside", () => {
    const box = { left: -5, top: 90, right: 105, bottom: 205 };
    expect(pathInBox(river, box)).toBe(true);
    expect(pathInBox(river, { ...box, bottom: 150 })).toBe(false);
  });
  it("moves a path from where it was", () => {
    expect(movedPath(river, 5, -5)[0]).toEqual({ x: 5, y: 95 });
  });
});

describe("copy and paste", () => {
  it("copies selected stamps and paths with the credits they use", () => {
    const { project, map } = setup();
    const clip = copySelection(project, map, ["a", "r"])!;
    expect(clip.objects.map((o) => o.id)).toEqual(["a"]);
    expect(clip.paths.map((p) => p.id)).toEqual(["r"]);
    expect(clip.credits.map((c) => c.id)).toEqual(["c1"]);
    expect(clip.centre).toEqual({ x: 50, y: 115 });
    // The clip is a copy: later edits to the map do not change it.
    map.objects[0].x = 999;
    expect(clip.objects[0].x).toBe(40);
  });

  it("copies nothing from locked layers", () => {
    const { project, map } = setup();
    map.layers.find((l) => l.id === "Objects")!.locked = true;
    expect(copySelection(project, map, ["a"])).toBeNull();
  });

  it("pastes new copies centred on the pointer, keeping groups among the copies", () => {
    const { project, map } = setup();
    const clip = copySelection(project, map, ["a", "b", "r"])!;
    const { project: next, ids } = pasteClip(project, map, clip, {
      x: 500,
      y: 500,
    });
    const pasted = next.maps[0];
    expect(pasted.objects).toHaveLength(5);
    expect(pasted.paths).toHaveLength(2);
    expect(ids).toHaveLength(3);
    expect(ids.every((id) => !["a", "b", "r"].includes(id))).toBe(true);
    const [a2, b2] = pasted.objects.slice(3);
    expect(a2.x - 40).toBe(500 - clip.centre.x);
    expect(a2.group).toBe(b2.group);
    expect(a2.group).not.toBe("g");
    expect(pasted.paths[1].points[0].x).toBe(0 + 500 - clip.centre.x);
    // The original is untouched.
    expect(pasted.objects[0]).toEqual(map.objects[0]);
  });

  it("pastes in place, drops links to maps the world lacks, and brings credits", () => {
    const { project, map, other } = setup();
    const clip = copySelection(project, map, ["a", "b", "r"])!;
    const elsewhere: Project = {
      ...project,
      maps: [other],
      activeMapId: other.id,
      credits: [],
    };
    const { project: next } = pasteClip(elsewhere, other, clip);
    const target = next.maps[0];
    expect(target.objects[0].x).toBe(40);
    expect(target.objects[1].linkedMap).toBeUndefined();
    expect(target.paths[0].layer).toBe("Water");
    expect(next.credits.map((c) => c.id)).toEqual(["c1"]);
  });

  it("cuts only what is on editable layers", () => {
    const { map } = setup();
    map.layers.find((l) => l.id === "Water")!.locked = true;
    const cut = removeSelection(map, ["a", "r"]);
    expect(cut.objects.map((o) => o.id)).toEqual(["b", "c"]);
    expect(cut.paths.map((p) => p.id)).toEqual(["r"]);
  });
});
