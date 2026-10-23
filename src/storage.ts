import { validFog } from "./fog";
import { isBundledSprite } from "./bundled-assets";
import { getWithLegacy } from "./legacy-keys";
import { migrateImages, pruneImages } from "./images";
import { MAX_BIOME } from "./biomes";
import { MAX_MIXES, validMix } from "./scatter-mixes";
import { BUILTIN_MATERIALS, PATTERNS } from "./materials";
import { isNoteUrl } from "./note-link";
import { CELL, MAX_CELLS } from "./mapsize";
import type { Project } from "./types";
const key = "ydming-project-v1";
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
/**
 * Grids as Float32Array for IndexedDB, without pictures no stamp uses; and
 * back to plain arrays when loaded, with pictures that old saves embed in
 * every stamp moved into the world's image table.
 */
export const packProject = (project: Project) =>
  mapGrids(pruneImages(project), (v) => Float32Array.from(v));
export const unpackProject = (project: Project) =>
  migrateImages(mapGrids(project, (v) => Array.from(v)));
/** The single project saved before worlds existed; `worlds.ts` moves it into the world list. */
export async function loadProject(): Promise<Project | undefined> {
  const project = await getWithLegacy<Project>(key);
  return project && unpackProject(project);
}
/**
 * Most stamps one map may hold when a file is opened. Copy and paste doubles a
 * map's stamps and the scatter brush adds hundreds a stroke, so ten thousand
 * (the old limit) made a saved world fail to open from its own export.
 */
export const MAX_OBJECTS = 200000;
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
    throw new Error("This is not a valid YDMing project.");
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
      m.objects.length > MAX_OBJECTS ||
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
        !m.terrain.biomes.every(
          (v) => Number.isInteger(v) && v >= 0 && v <= MAX_BIOME,
        ))
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
    if (m.fog !== undefined && !validFog(m.fog, m))
      throw new Error("The project contains invalid fog of war.");
    if (
      m.decorErased !== undefined &&
      (!Array.isArray(m.decorErased) ||
        !m.decorErased.every(
          (c) =>
            c && [c.x, c.y, c.r].every((v) => Number.isFinite(v)) && c.r > 0,
        ))
    )
      throw new Error("The project contains invalid erased areas.");
    for (const path of m.paths)
      if (
        !Array.isArray(path.points) ||
        (path.widths !== undefined &&
          (!Array.isArray(path.widths) ||
            path.widths.length !== path.points.length ||
            !path.widths.every((w) => Number.isFinite(w))))
      )
        throw new Error("The project contains an invalid path.");
    if (
      [m, ...m.objects].some(
        (x) => x.noteUrl !== undefined && !isNoteUrl(x.noteUrl),
      )
    )
      throw new Error("Note links must be obsidian:// or web links.");
    for (const o of m.objects) {
      if (
        o.tint !== undefined &&
        !(Number.isFinite(o.tint) && o.tint >= -1 && o.tint <= 1)
      )
        throw new Error("The project contains an invalid stamp tint.");
      if (
        o.imageId !== undefined &&
        (typeof o.imageId !== "string" || !p.images?.[o.imageId])
      )
        throw new Error("The project is missing an image that a stamp uses.");
      if (
        o.image &&
        !/^data:image\/(png|jpeg|webp);base64,/.test(o.image) &&
        // Sprites that ship with the app are referenced by path, not copied in.
        !isBundledSprite(o.image)
      )
        throw new Error(
          "Imported images must be embedded PNG, JPEG, or WebP files.",
        );
    }
  }
  if (
    p.images !== undefined &&
    (!p.images ||
      typeof p.images !== "object" ||
      Array.isArray(p.images) ||
      !Object.entries(p.images).every(
        ([id, src]) =>
          /^[\w-]{1,64}$/.test(id) &&
          typeof src === "string" &&
          /^data:image\/(png|jpeg|webp);base64,/.test(src),
      ))
  )
    throw new Error("The project contains an invalid image.");
  if (
    p.scatterMixes !== undefined &&
    (!Array.isArray(p.scatterMixes) ||
      p.scatterMixes.length > MAX_MIXES ||
      !p.scatterMixes.every(validMix) ||
      new Set(p.scatterMixes.map((m) => m.id)).size !== p.scatterMixes.length)
  )
    throw new Error("The project contains an invalid scatter mix.");
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
          (t.tint === undefined || /^#[0-9a-f]{6}$/i.test(t.tint)) &&
          (t.tiling === undefined ||
            ["tiled", "blended", "unveil"].includes(t.tiling)) &&
          (t.cover === undefined ||
            /^data:image\/(png|jpeg|webp);base64,/.test(t.cover)) &&
          (t.preset === undefined || /^[\w-]{1,64}$/.test(t.preset)),
      ) ||
      !BUILTIN_MATERIALS.every((id) => p.textures!.some((t) => t.id === id)))
  )
    throw new Error("The project contains invalid texture layers.");
  if (!p.maps.some((m) => m.id === p.activeMapId)) p.activeMapId = p.maps[0].id;
  return p;
}
