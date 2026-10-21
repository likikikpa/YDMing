import { fogOf } from "./fog";
import type { FogGrid } from "./fog";
import type { MapData } from "./types";

export interface FogOptions {
  /** Players' view: hidden ground is covered completely. */
  player?: boolean;
  /** The GM's view: hidden ground is dimmed so it can still be seen. */
  fog?: boolean;
  /** Only this part of the map is being redrawn. */
  clip?: { x: number; y: number; w: number; h: number };
}

// One small canvas is reused for every draw; it holds a pixel per fog cell.
let scratch: HTMLCanvasElement | undefined;

/**
 * Hidden cells are solid. Revealed cells next to them fade a little, which,
 * once the canvas is stretched over the map, gives the fog a soft edge without
 * letting any of the hidden ground show through.
 */
function fogPixels(grid: FogGrid, hiddenAlpha: number): HTMLCanvasElement {
  const { cols, rows, hidden } = grid;
  scratch ??= document.createElement("canvas");
  if (scratch.width !== cols || scratch.height !== rows) {
    scratch.width = cols;
    scratch.height = rows;
  }
  const ctx = scratch.getContext("2d")!,
    image = ctx.createImageData(cols, rows),
    data = image.data;
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      let alpha = hiddenAlpha;
      if (!hidden[i]) {
        // Cells past the map edge count as the cell beside them.
        let near = 0;
        for (let dy = -1; dy <= 1; dy++)
          for (let dx = -1; dx <= 1; dx++)
            near +=
              hidden[
                Math.min(rows - 1, Math.max(0, y + dy)) * cols +
                  Math.min(cols - 1, Math.max(0, x + dx))
              ];
        alpha = (near / 9) * 0.8 * hiddenAlpha;
      }
      const o = i * 4;
      data[o] = 16;
      data[o + 1] = 13;
      data[o + 2] = 10;
      data[o + 3] = Math.round(alpha * 255);
    }
  ctx.putImageData(image, 0, 0);
  return scratch;
}

/** Draws the fog of war over the map: solid for players, a dim veil for the GM. */
export function drawFog(
  ctx: CanvasRenderingContext2D,
  map: MapData,
  options: FogOptions,
) {
  const grid = fogOf(map);
  if (!grid || !(options.player || options.fog)) return;
  ctx.save();
  const { clip } = options;
  if (clip) {
    ctx.beginPath();
    ctx.rect(clip.x, clip.y, clip.w, clip.h);
    ctx.clip();
  }
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(
    fogPixels(grid, options.player ? 1 : 0.55),
    0,
    0,
    grid.cols * grid.cell,
    grid.rows * grid.cell,
  );
  ctx.restore();
}
