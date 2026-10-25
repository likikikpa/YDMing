import { resolveStyle } from "./map-styles";
import type { LiveStyleId } from "./map-styles";

/** A lettering face that ships with the app for names on the map. */
export interface MapFont {
  id: string;
  name: string;
  file: string;
  /** Variable weight range, for faces that can be bold. */
  weight?: string;
}

/**
 * The faces are OFL fonts (see `public/fonts/map/FONTS.txt`); those without a
 * reserved name are cut down to Latin and Cyrillic. Ids are saved in labels, so they are only
 * ever added, never renamed.
 */
export const MAP_FONTS: MapFont[] = [
  {
    id: "alegreya",
    name: "Alegreya",
    file: "alegreya.woff2",
    weight: "400 900",
  },
  { id: "cinzel", name: "Cinzel", file: "cinzel.woff2", weight: "400 900" },
  { id: "fell", name: "IM Fell English", file: "im-fell-english.woff2" },
  {
    id: "fell-italic",
    name: "IM Fell English Italic",
    file: "im-fell-english-italic.woff2",
  },
  { id: "pirata", name: "Pirata One", file: "PirataOne-Regular.ttf" },
  { id: "uncial", name: "Uncial Antiqua", file: "UncialAntiqua-Regular.ttf" },
  { id: "marck", name: "Marck Script", file: "MarckScript-Regular.ttf" },
];
const byId = new Map(MAP_FONTS.map((f) => [f.id, f]));

/** What a label with no face of its own is lettered in, by map style. */
const STYLE_FONT: Record<LiveStyleId, string> = {
  fantasy: "alegreya",
  ink: "fell-italic",
  realistic: "alegreya",
};
export const styleFont = (style: string | undefined) =>
  STYLE_FONT[resolveStyle(style)];

const family = (id: string) => `"YDM ${byId.get(id)?.name ?? "Alegreya"}"`;

/**
 * A CSS font for a canvas: the face, then Alegreya for letters it lacks (most
 * have no Cyrillic), then the system's serif while the faces load.
 */
export function mapFont(
  id: string | undefined,
  size: number,
  style?: string,
  bold = false,
) {
  const face = id && byId.has(id) ? id : styleFont(style),
    stack =
      face === "alegreya"
        ? family(face)
        : `${family(face)}, ${family("alegreya")}`;
  return `${bold ? "bold " : ""}${size}px ${stack}, Georgia, serif`;
}

let loading: Promise<void> | undefined;
/** Adds every face to the page once; a face that fails to load leaves its fallback. */
export function loadMapFonts() {
  if (typeof document === "undefined" || typeof FontFace === "undefined")
    return Promise.resolve();
  loading ??= Promise.allSettled(
    MAP_FONTS.map(async (f) => {
      const face = new FontFace(
        family(f.id).slice(1, -1),
        `url(/fonts/map/${f.file}) format("${f.file.endsWith(".ttf") ? "truetype" : "woff2"}")`,
        f.weight ? { weight: f.weight } : {},
      );
      document.fonts.add(await face.load());
    }),
  ).then(() => undefined);
  return loading;
}
