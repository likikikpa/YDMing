import { expect, it } from "vitest";
import { generateMap, traceRiver } from "./generator";
import { editableTerrain, terrainView } from "./terrain";
import { validateProject } from "./storage";
import { defaultSettings } from "./types";
import type { Project } from "./types";

it("keeps dungeon floor geometry and room keys intact when editing landscape and tracing rivers", () => {
  const map = generateMap("dungeon", defaultSettings);
  const floors = [...map.heights];
  const rooms = structuredClone(map.rooms);
  const terrain = editableTerrain(map);
  terrain.heights.fill(0.7);
  terrain.heights[0] = 0;
  terrain.biomes[1] = 6;
  traceRiver(terrainView(map), Math.floor(map.heights.length / 2));
  expect(map.heights).toEqual(floors);
  expect(map.rooms).toEqual(rooms);
  expect(terrainView(map).biomes[1]).toBe(6);
  expect(editableTerrain(map)).toBe(terrain);
});

it("edits the existing landscape directly on world and city maps", () => {
  for (const kind of ["world", "city"] as const) {
    const map = generateMap(kind, defaultSettings);
    const terrain = editableTerrain(map);
    terrain.heights[0] = 0.9;
    terrain.biomes[0] = 8;
    expect(terrainView(map).heights[0]).toBe(0.9);
    expect(map.biomes[0]).toBe(8);
    expect(map.terrain).toBeUndefined();
  }
});

it("round-trips dungeon landscape and rejects invalid landscape geometry", () => {
  const map = generateMap("dungeon", defaultSettings);
  editableTerrain(map).heights[0] = 0.8;
  const project: Project = {
    version: 1,
    id: "terrain",
    name: "Terrain",
    maps: [map],
    activeMapId: map.id,
    credits: [],
    commercial: false,
    updatedAt: "",
  };
  expect(validateProject(JSON.parse(JSON.stringify(project)))).toEqual(project);
  expect(() =>
    validateProject({
      ...project,
      maps: [{ ...map, terrain: { heights: [], biomes: [] } }],
    }),
  ).toThrow("invalid landscape data");
});
