import type { MapData, TerrainData } from "./types";

// Dungeon heights describe walkable floors. Landscape tools edit a separate
// surface beneath those floors so sculpting cannot change room or VTT geometry.
export function editableTerrain(map: MapData): TerrainData {
  if (map.kind !== "dungeon") return map;
  return (map.terrain ??= {
    heights: new Array(map.cols * map.rows).fill(0),
    biomes: new Array(map.cols * map.rows).fill(0),
  });
}

export function terrainView(map: MapData): MapData {
  return map.kind === "dungeon" && map.terrain
    ? { ...map, ...map.terrain }
    : map;
}
