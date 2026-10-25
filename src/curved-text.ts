/** Where one letter of a line of text goes, relative to the line's centre. */
export interface Glyph {
  text: string;
  x: number;
  y: number;
  /** Turn of the letter, in radians. */
  angle: number;
}

/**
 * Lays a line of text out letter by letter, centred on the origin.
 * `advances[i]` is the width of the first i letters as the font sets them
 * (so pairs keep their kerning), with one more entry for the whole line.
 * `spacing` is extra room after each letter but the last, in pixels.
 * `curve` bends the line along a circle: 1 is a half circle arching up, -1
 * one sagging down, 0 straight. The middle of the arc stays on the origin.
 * `fit` squeezes the line to at most this width, as `fillText` does;
 * `squeeze` is how much each letter is narrowed for it.
 */
export function layoutLine(
  letters: string[],
  advances: number[],
  spacing: number,
  curve: number,
  fit = Infinity,
): { glyphs: Glyph[]; squeeze: number } {
  const n = letters.length;
  if (!n) return { glyphs: [], squeeze: 1 };
  const natural = advances[n] + spacing * (n - 1),
    squeeze = natural > fit && fit > 0 ? fit / natural : 1,
    width = natural * squeeze,
    centres = letters.map(
      (_, i) =>
        ((advances[i] + advances[i + 1]) / 2 + spacing * i) * squeeze -
        width / 2,
    );
  const sweep = Math.max(-1, Math.min(1, curve)) * Math.PI;
  if (Math.abs(sweep) < 1e-3)
    return {
      glyphs: letters.map((text, i) => ({
        text,
        x: centres[i],
        y: 0,
        angle: 0,
      })),
      squeeze,
    };
  // Bend the line round a circle whose arc is as long as the line.
  const radius = width / Math.abs(sweep),
    side = Math.sign(sweep),
    lift = (radius * (1 - Math.cos(sweep / 2))) / 2;
  const glyphs = letters.map((text, i) => {
    const a = centres[i] / radius;
    return {
      text,
      x: radius * Math.sin(a),
      y: side * (radius * (1 - Math.cos(a)) - lift),
      angle: side * a,
    };
  });
  return { glyphs, squeeze };
}

/** The letters of a string, keeping surrogate pairs whole. */
export const lettersOf = (text: string) => Array.from(text);
