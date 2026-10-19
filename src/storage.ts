import { get, set } from "idb-keyval";
import type { Project } from "./types";
const key = "atlasforge-project-v1";
export async function loadProject(): Promise<Project | undefined> {
  return get(key);
}
export async function saveProject(project: Project) {
  await set(key, project);
}
export function validateProject(value: unknown): Project {
  const p = value as Project;
  if (
    !p ||
    p.version !== 1 ||
    !Array.isArray(p.maps) ||
    !p.maps.length ||
    p.maps.length > 100 ||
    !Array.isArray(p.credits)
  )
    throw new Error("This is not a valid Atlasforge project.");
  for (const m of p.maps) {
    if (
      !["world", "city", "dungeon"].includes(m.kind) ||
      !Number.isInteger(m.cols) ||
      !Number.isInteger(m.rows) ||
      m.cols < 1 ||
      m.rows < 1 ||
      m.cols * m.rows > 1000000 ||
      m.width !== 1200 ||
      m.height !== 850 ||
      !Array.isArray(m.heights) ||
      m.heights.length !== m.cols * m.rows ||
      !m.heights.every(
        (v) => typeof v === "number" && Number.isFinite(v) && v >= 0 && v <= 1,
      ) ||
      !Array.isArray(m.biomes) ||
      m.biomes.length !== m.heights.length ||
      !Array.isArray(m.objects) ||
      m.objects.length > 10000 ||
      !Array.isArray(m.layers) ||
      !m.settings ||
      !Array.isArray(m.paths) ||
      !Array.isArray(m.rooms) ||
      !Array.isArray(m.strokes)
    )
      throw new Error("The project contains invalid map data.");
    if (
      m.terrain !== undefined &&
      (!m.terrain ||
        !Array.isArray(m.terrain.heights) ||
        m.terrain.heights.length !== m.cols * m.rows ||
        !m.terrain.heights.every((v) => Number.isFinite(v) && v >= 0 && v <= 1) ||
        !Array.isArray(m.terrain.biomes) ||
        m.terrain.biomes.length !== m.cols * m.rows ||
        !m.terrain.biomes.every((v) => Number.isInteger(v) && v >= 0 && v <= 12))
    )
      throw new Error("The project contains invalid landscape data.");
    for (const path of m.paths)
      if (
        !Array.isArray(path.points) ||
        (path.widths !== undefined &&
          (!Array.isArray(path.widths) ||
            path.widths.length !== path.points.length ||
            !path.widths.every((w) => Number.isFinite(w))))
      )
        throw new Error("The project contains an invalid path.");
    for (const o of m.objects) {
      if (
        o.image &&
        !/^data:image\/(png|jpeg|webp);base64,/.test(o.image) &&
        // Sprites that ship with the app are referenced by path, not copied in.
        !/^\/assets\/(cartography|medieval)\/[\w.-]+\.png$/.test(o.image)
      )
        throw new Error(
          "Imported images must be embedded PNG, JPEG, or WebP files.",
        );
    }
  }
  if (!p.maps.some((m) => m.id === p.activeMapId)) p.activeMapId = p.maps[0].id;
  return p;
}
