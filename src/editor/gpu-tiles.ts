import { Sprite, Texture } from "pixi.js";

/** Edge of one GPU tile of the map, in map pixels. */
export const GPU_TILE = 256;
export interface GpuTile {
  x: number;
  y: number;
  canvas: HTMLCanvasElement;
  sprite: Sprite;
}
export function makeTiles(width: number, height: number): GpuTile[] {
  const out: GpuTile[] = [];
  for (let y = 0; y < height; y += GPU_TILE)
    for (let x = 0; x < width; x += GPU_TILE) {
      const canvas = document.createElement("canvas");
      canvas.width = Math.min(GPU_TILE, width - x);
      canvas.height = Math.min(GPU_TILE, height - y);
      const sprite = new Sprite(Texture.from(canvas, true));
      sprite.position.set(x, y);
      out.push({ x, y, canvas, sprite });
    }
  return out;
}
