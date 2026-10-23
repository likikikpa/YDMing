import { objectImage } from "./images";
import type { ImageTable } from "./images";
import { drawLabel } from "./labels";
import { imageCache, loadImage } from "./render";
import { drawStamp } from "./stamps";
import { SYMBOL_SCALE, SYMBOL_SPRITES } from "./symbols";
import { tinted } from "./tint";
import type { MapObject } from "./types";

/**
 * Draws a picture stamp without saving and restoring the canvas state, which
 * took over a third of a full redraw of a map with 100,000 stamps. An upright,
 * unflipped stamp needs no transform; others set one built on `base`, the
 * transform the canvas had before any object was drawn, and put it back.
 */
function drawPicture(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  picture: CanvasImageSource,
  base: DOMMatrix,
) {
  if (!o.rotation && !o.flipX && !o.flipY) {
    ctx.drawImage(
      picture,
      o.x - o.width / 2,
      o.y - o.height / 2,
      o.width,
      o.height,
    );
    return;
  }
  const turn = (o.rotation * Math.PI) / 180,
    cos = Math.cos(turn),
    sin = Math.sin(turn),
    sx = o.flipX ? -1 : 1,
    sy = o.flipY ? -1 : 1,
    // The stamp's own transform: move to it, turn, then mirror.
    a = cos * sx,
    b = sin * sx,
    c = -sin * sy,
    d = cos * sy;
  ctx.setTransform(
    base.a * a + base.c * b,
    base.b * a + base.d * b,
    base.a * c + base.c * d,
    base.b * c + base.d * d,
    base.a * o.x + base.c * o.y + base.e,
    base.b * o.x + base.d * o.y + base.f,
  );
  ctx.drawImage(picture, -o.width / 2, -o.height / 2, o.width, o.height);
  ctx.setTransform(base);
}

/**
 * Draws one stamp, label or symbol of the map. `base` is the canvas's
 * transform before the first object of the layer, which lets picture stamps
 * skip save and restore.
 */
export function drawObject(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  variant: number,
  images?: ImageTable,
  style = "",
  base?: DOMMatrix,
) {
  const picture = o.kind === "image" ? objectImage(o, images) : undefined;
  if (picture && base) {
    const img = imageCache.get(picture);
    if (img?.complete) drawPicture(ctx, o, tinted(img, o.tint), base);
    else void loadImage(picture).catch(() => undefined);
    return;
  }
  ctx.save();
  ctx.translate(o.x, o.y);
  ctx.rotate((o.rotation * Math.PI) / 180);
  ctx.scale(o.flipX ? -1 : 1, o.flipY ? -1 : 1);
  if (o.kind === "label") {
    drawLabel(ctx, o, style);
  } else if (picture) {
    const img = imageCache.get(picture);
    if (img?.complete)
      ctx.drawImage(
        tinted(img, o.tint),
        -o.width / 2,
        -o.height / 2,
        o.width,
        o.height,
      );
    else void loadImage(picture).catch(() => undefined);
  } else {
    const src = SYMBOL_SPRITES[o.kind as keyof typeof SYMBOL_SPRITES],
      img = src ? imageCache.get(src) : undefined;
    if (img?.complete) {
      // Fit the sprite inside the object's box, keeping its proportions.
      const k =
        Math.min(o.width / img.naturalWidth, o.height / img.naturalHeight) *
        SYMBOL_SCALE;
      ctx.drawImage(
        img,
        (-img.naturalWidth * k) / 2,
        (-img.naturalHeight * k) / 2,
        img.naturalWidth * k,
        img.naturalHeight * k,
      );
    } else drawStamp(ctx, o.kind, o.width, o.height, o.color, variant);
  }
  ctx.restore();
}
