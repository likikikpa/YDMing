import { imageCache, loadImage } from "./render";

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

const wanted = new Set<string>(),
  inflight = new Set<string>(),
  failed = new Set<string>(),
  loadedListeners = new Set<() => void>();
let scheduled = false;

/**
 * Asks for a picture that was needed before it had loaded. Requests made
 * during one draw are loaded together, a picture is asked for once however
 * often it is drawn meanwhile or fails to load, and listeners are told when
 * any arrive, so the map can draw again with them.
 */
export function wantSprite(src: string) {
  if (imageCache.get(src) || inflight.has(src) || failed.has(src)) return;
  wanted.add(src);
  if (scheduled) return;
  scheduled = true;
  void Promise.resolve().then(async () => {
    const urls = [...wanted];
    wanted.clear();
    scheduled = false;
    for (const url of urls) inflight.add(url);
    const results = await Promise.allSettled(urls.map((url) => loadImage(url)));
    results.forEach((result, i) => {
      inflight.delete(urls[i]);
      if (result.status === "rejected") failed.add(urls[i]);
    });
    if (results.some((r) => r.status === "fulfilled"))
      for (const listener of loadedListeners) listener();
  });
}

/** Calls `listener` whenever pictures asked for with `wantSprite` have loaded; returns the way to stop. */
export function onSpritesLoaded(listener: () => void) {
  loadedListeners.add(listener);
  return () => void loadedListeners.delete(listener);
}

/** A picture cut to its drawing: base on the spot, equal visual area for any proportions, soft shadow. */
export function drawPainted(
  ctx: CanvasRenderingContext2D,
  sprite: DecorSprite,
  spot: { x: number; y: number },
  size: number,
) {
  const aspect = sprite.width / sprite.height,
    w = size * Math.sqrt(aspect),
    h = size / Math.sqrt(aspect);
  ctx.fillStyle = "rgba(28, 42, 22, 0.28)";
  ctx.beginPath();
  ctx.ellipse(
    spot.x + w * 0.04,
    spot.y,
    w * 0.42,
    Math.max(1.5, h * 0.09),
    0,
    0,
    Math.PI * 2,
  );
  ctx.fill();
  ctx.drawImage(sprite.source, spot.x - w / 2, spot.y - h * 0.94, w, h);
}
