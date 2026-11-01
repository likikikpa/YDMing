import { resolveStyle } from "./map-styles";

/**
 * The colour a style draws a colour of its own with. Pen & ink is for
 * printing without colour, so any colour the map draws for itself (roads,
 * walls, borders, river banks, names) becomes a neutral grey, darkened so a
 * mid colour prints as ink, not as a faint halftone. Alpha is kept. Other
 * styles, and colours the user picked for a stroke, are left as they are.
 */
export function tone(style: string | undefined, css: string): string {
  if (resolveStyle(style) !== "pen") return css;
  const rgba = parse(css);
  if (!rgba) return css;
  const [r, g, b, a] = rgba;
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const v = Math.round(((luma * luma) / 255) * 0.9);
  return a < 1 ? `rgba(${v}, ${v}, ${v}, ${a})` : `rgb(${v}, ${v}, ${v})`;
}

function parse(css: string): [number, number, number, number] | undefined {
  const hex = /^#([0-9a-f]{3,8})$/i.exec(css.trim());
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join("");
    if (h.length !== 6 && h.length !== 8) return undefined;
    const n = (i: number) => parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) / 255 : 1];
  }
  const fn =
    /^rgba?\(\s*([\d.]+)[ ,]+([\d.]+)[ ,]+([\d.]+)(?:\s*[,/]\s*([\d.]+%?))?\s*\)$/i.exec(
      css.trim(),
    );
  if (!fn) return undefined;
  const alpha =
    fn[4] === undefined
      ? 1
      : fn[4].endsWith("%")
        ? parseFloat(fn[4]) / 100
        : parseFloat(fn[4]);
  return [Number(fn[1]), Number(fn[2]), Number(fn[3]), alpha];
}
