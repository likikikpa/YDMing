import { get, set } from "idb-keyval";
import { BUILTIN_MATERIALS, PATTERNS } from "./materials";
import { CELL, MAX_CELLS } from "./mapsize";
import type { Project } from "./types";
const key = "atlasforge-project-v1";
/** Per-cell grids that are stored as Float32Array: a large map's heights stay a few MB. */
const GRIDS = ["heights", "biomes", "materials"] as const;
type Grids = Partial<Record<(typeof GRIDS)[number], ArrayLike<number>>>;
function mapGrids(project: Project, convert: (v: ArrayLike<number>) => ArrayLike<number>) {
  return {
    ...project,
    maps: project.maps.map((m) => {
      const out = { ...m } as typeof m & Grids;
      for (const k of GRIDS) if (m[k]) (out as Grids)[k] = convert(m[k]!);
      if (m.terrain) {
        const t = { ...m.terrain } as Grids;
        for (const k of GRIDS)
          if (m.terrain[k]) t[k] = convert(m.terrain[k]!);
        out.terrain = t as typeof m.terrain;
      }
      return out;
    }),
  } as Project;
}
export async function loadProject(): Promise<Project | undefined> {
  const project = await get<Project>(key);
  return project && mapGrids(project, (v) => Array.from(v));
}
export async function saveProject(project: Project) {
  await set(key, mapGrids(project, (v) => Float32Array.from(v)));
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
      !Number.isFinite(m.width) ||
      !Number.isFinite(m.height) ||
      (m.kind === "dungeon"
        ? m.width !== 1200 || m.height !== 850
        : m.width !== m.cols * CELL ||
          m.height !== m.rows * CELL ||
          m.cols > MAX_CELLS ||
          m.rows > MAX_CELLS) ||
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
        !m.terrain.biomes.every((v) => Number.isInteger(v) && v >= 0 && v <= 13))
    )
      throw new Error("The project contains invalid landscape data.");
    for (const t of [m, m.terrain])
      if (
        t?.materials !== undefined &&
        (!Array.isArray(t.materials) ||
          t.materials.length !== m.cols * m.rows ||
          !t.materials.every((v) => Number.isInteger(v) && v >= 0) ||
          !Array.isArray(m.materialKeys) ||
          !m.materialKeys.every((k) => typeof k === "string"))
      )
        throw new Error("The project contains invalid ground materials.");
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
  if (
    p.textures !== undefined &&
    (!Array.isArray(p.textures) ||
      !p.textures.every(
        (t) =>
          t &&
          typeof t.id === "string" &&
          typeof t.name === "string" &&
          PATTERNS.includes(t.pattern) &&
          Number.isFinite(t.scale) &&
          Number.isFinite(t.strength) &&
          (t.image === undefined ||
            /^data:image\/(png|jpeg|webp);base64,/.test(t.image)) &&
          (t.tint === undefined || /^#[0-9a-f]{6}$/i.test(t.tint)),
      ) ||
      !BUILTIN_MATERIALS.every((id) => p.textures!.some((t) => t.id === id)))
  )
    throw new Error("The project contains invalid texture layers.");
  if (!p.maps.some((m) => m.id === p.activeMapId)) p.activeMapId = p.maps[0].id;
  return p;
}
