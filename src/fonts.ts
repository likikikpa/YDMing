import { imageId } from "./images";
import type { Project } from "./types";

/** A font the user added to a world: its name for the list, and the file as a data URL. */
export interface ImportedFont {
  name: string;
  data: string;
}
/** Imported fonts are kept once per world in `Project.fonts`; labels name one with `font`. */
export type FontTable = Record<string, ImportedFont>;

export interface BundledFont {
  id: string;
  label: string;
  /** Whether it has Cyrillic letters, for names written in Russian. */
  cyrillic: boolean;
}

/**
 * The fonts that ship with the app, as WOFF2 files in `public/fonts/`, each
 * under the SIL Open Font Licence (`public/fonts/LICENSES.txt`). They load
 * the first time a map uses one and are kept for offline use.
 */
export const BUNDLED_FONTS: readonly BundledFont[] = [
  { id: "cormorant-sc", label: "Cormorant SC", cyrillic: true },
  { id: "eb-garamond", label: "EB Garamond", cyrillic: true },
  { id: "alegreya", label: "Alegreya", cyrillic: true },
  { id: "philosopher", label: "Philosopher", cyrillic: true },
  { id: "forum", label: "Forum", cyrillic: true },
  { id: "kurale", label: "Kurale", cyrillic: true },
  { id: "marck-script", label: "Marck Script", cyrillic: true },
  { id: "ruslan-display", label: "Ruslan Display", cyrillic: true },
  { id: "cinzel", label: "Cinzel", cyrillic: false },
  { id: "uncial-antiqua", label: "Uncial Antiqua", cyrillic: false },
  { id: "pirata-one", label: "Pirata One", cyrillic: false },
];
export const isBundledFont = (id: string) =>
  BUNDLED_FONTS.some((f) => f.id === id);

/** What map text is drawn in when no font is chosen. */
export const DEFAULT_STACK = "Georgia, serif";
/** The CSS family a font is registered under. */
export const fontFamily = (id: string) => `ydm-${id}`;
/** The `font-family` list for a font: the font, then the default for letters it lacks. */
export const stackOf = (id: string) => `"${fontFamily(id)}", ${DEFAULT_STACK}`;

export const FONT_ID = /^[\w-]{1,64}$/;
export const validFontId = (id: unknown): id is string =>
  typeof id === "string" && FONT_ID.test(id);

export const MAX_FONTS = 12;
export const MAX_FONT_BYTES = 3_000_000;
/** Error messages are English keys: the UI passes them through `t()`. */
export const FONT_FILE_ERROR =
  "Fonts must be TTF, OTF, WOFF or WOFF2 files under 3 MB.";
export const FONT_LIMIT_ERROR =
  "A world holds up to 12 fonts that its maps use.";
export const FONT_UNUSABLE_ERROR = "That file is not a usable font.";

const DATA_URL =
  /^data:font\/(ttf|otf|woff|woff2);base64,[A-Za-z0-9+/]+={0,2}$/;
export type FontFormat = "ttf" | "otf" | "woff" | "woff2";

/** The format a file really is, from its first bytes, whatever its name says. */
export function fontFormat(bytes: Uint8Array): FontFormat | undefined {
  if (bytes.length < 12) return undefined;
  const tag = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  if (tag === "OTTO") return "otf";
  if (tag === "wOFF") return "woff";
  if (tag === "wOF2") return "woff2";
  // Font collections (ttcf) hold several fonts and are not accepted.
  if (tag === "\u0000\u0001\u0000\u0000" || tag === "true") return "ttf";
  return undefined;
}

export function toBase64(bytes: Uint8Array) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 8192)
    binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
  return btoa(binary);
}

export function fromDataUrl(data: string): ArrayBuffer {
  const binary = atob(data.slice(data.indexOf(",") + 1)),
    bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

/** The name a font gets in the list: its file name without the extension. */
export function fontNameFromFile(file: string) {
  const name = file
    .replace(/\.[^.]*$/, "")
    .replace(/[_\s]+/g, " ")
    .trim()
    .slice(0, 80);
  return name || "Font";
}

/** Reads a font file into a table entry. Throws an English message that `t()` knows. */
export async function readFontFile(
  file: Blob & { name: string },
): Promise<{ id: string; font: ImportedFont }> {
  if (file.size > MAX_FONT_BYTES) throw new Error(FONT_FILE_ERROR);
  const bytes = new Uint8Array(await file.arrayBuffer()),
    format = fontFormat(bytes);
  if (!format) throw new Error(FONT_FILE_ERROR);
  const data = `data:font/${format};base64,${toBase64(bytes)}`;
  return {
    id: `f${imageId(data).slice(1)}`,
    font: { name: fontNameFromFile(file.name), data },
  };
}

/** Whether a table is made only of fonts this app wrote: for opening a project file. */
export function validFonts(fonts: unknown): fonts is FontTable {
  if (!fonts || typeof fonts !== "object" || Array.isArray(fonts)) return false;
  const entries = Object.entries(fonts);
  return (
    entries.length <= MAX_FONTS &&
    entries.every(
      ([id, f]) =>
        FONT_ID.test(id) &&
        !!f &&
        typeof f === "object" &&
        typeof (f as ImportedFont).name === "string" &&
        (f as ImportedFont).name.length > 0 &&
        (f as ImportedFont).name.length <= 80 &&
        typeof (f as ImportedFont).data === "string" &&
        (f as ImportedFont).data.length <= (MAX_FONT_BYTES * 4) / 3 + 64 &&
        DATA_URL.test((f as ImportedFont).data),
    )
  );
}

/** The fonts the maps use: a label's own font and each map's label font. */
export function usedFontIds(project: Project) {
  const used = new Set<string>();
  for (const m of project.maps) {
    if (m.settings.labelFont) used.add(m.settings.labelFont);
    for (const o of m.objects) if (o.font) used.add(o.font);
  }
  return used;
}

/** The project without fonts no map uses, for saving and for making room. */
export function pruneFonts(project: Project): Project {
  const fonts = project.fonts;
  if (!fonts) return project;
  const used = usedFontIds(project),
    keys = Object.keys(fonts);
  if (keys.every((k) => used.has(k))) return project;
  const { fonts: _all, ...rest } = project;
  const kept = Object.fromEntries(
    keys.filter((k) => used.has(k)).map((k) => [k, fonts[k]]),
  );
  return Object.keys(kept).length ? { ...rest, fonts: kept } : rest;
}
