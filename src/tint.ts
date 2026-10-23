import { clamp } from "./random";

/** Tint steps either side of the picture itself; a tint is rounded to one. */
export const TINT_STEPS = 3;

/** The longest side of a tinted copy: copies are for stamps, which are drawn small. */
const MAX_SIDE = 256;

/** How strongly the strongest step colours the picture. */
const STRENGTH = 0.3;

/** The step a tint from -1 (darker, cooler) to 1 (lighter, warmer) is drawn at. */
export function tintStep(tint: number | undefined) {
  if (!Number.isFinite(tint)) return 0;
  // Round the size, not the signed value, so +0.5 and -0.5 reach the same step.
  const step = Math.round(Math.abs(clamp(tint!, -1, 1)) * TINT_STEPS);
  return tint! < 0 ? 0 - step : step;
}

/** The colour laid over the picture at a step, and how opaque it is. */
export function tintColour(step: number) {
  const alpha = (Math.abs(step) / TINT_STEPS) * STRENGTH;
  return step > 0 ? `rgba(255,232,170,${alpha})` : `rgba(24,40,90,${alpha})`;
}

const copies = new WeakMap<HTMLImageElement, Map<number, HTMLCanvasElement>>();

/**
 * The picture to draw for a tint. Each picture is recoloured once per step
 * and kept, so thousands of stamps cost a lookup each, not a filter each.
 */
export function tinted(
  img: HTMLImageElement,
  tint: number | undefined,
): CanvasImageSource {
  const step = tintStep(tint);
  if (!step) return img;
  let byStep = copies.get(img);
  if (!byStep) copies.set(img, (byStep = new Map()));
  let copy = byStep.get(step);
  if (!copy) {
    const k = Math.min(
      1,
      MAX_SIDE / Math.max(img.naturalWidth, img.naturalHeight, 1),
    );
    copy = document.createElement("canvas");
    copy.width = Math.max(1, Math.round(img.naturalWidth * k));
    copy.height = Math.max(1, Math.round(img.naturalHeight * k));
    const c = copy.getContext("2d")!;
    c.drawImage(img, 0, 0, copy.width, copy.height);
    c.globalCompositeOperation = "source-atop";
    c.fillStyle = tintColour(step);
    c.fillRect(0, 0, copy.width, copy.height);
    byStep.set(step, copy);
  }
  return copy;
}
