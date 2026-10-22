import { imageCache } from "./render";

/** A decoration picture ready to draw, with its size in pixels. */
export interface DecorSprite {
  source: CanvasImageSource;
  width: number;
  height: number;
}

/**
 * Longest side a decoration is kept at. The pictures are 512 px but are drawn
 * a few dozen pixels wide, and a large zoom still needs less than this.
 */
const LONGEST = 256;

const sprites = new Map<string, DecorSprite>();

/** The picture at `src` once it has loaded, reduced once however often it is drawn. */
export function decorSprite(src: string): DecorSprite | undefined {
  let sprite = sprites.get(src);
  if (sprite) return sprite;
  const image = imageCache.get(src);
  if (!image?.complete || !image.naturalWidth) return undefined;
  sprite = reduced(image);
  sprites.set(src, sprite);
  return sprite;
}

/** Halves the picture until it is near the target: one big step aliases the fine detail. */
function reduced(image: HTMLImageElement): DecorSprite {
  let width = image.naturalWidth,
    height = image.naturalHeight,
    source: CanvasImageSource = image;
  const k = Math.min(1, LONGEST / Math.max(width, height)),
    targetWidth = Math.max(1, Math.round(width * k)),
    targetHeight = Math.max(1, Math.round(height * k));
  while (width > targetWidth) {
    const nextWidth = Math.max(targetWidth, Math.round(width / 2)),
      nextHeight = Math.max(targetHeight, Math.round(height / 2)),
      canvas = document.createElement("canvas");
    canvas.width = nextWidth;
    canvas.height = nextHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(source, 0, 0, nextWidth, nextHeight);
    source = canvas;
    width = nextWidth;
    height = nextHeight;
  }
  return { source, width, height };
}
