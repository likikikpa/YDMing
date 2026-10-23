import { objectImage } from "./images";
import type { ImageTable } from "./images";
import { drawLabel } from "./labels";
import { imageCache, loadImage } from "./render";
import { drawStamp } from "./stamps";
import { SYMBOL_SCALE, SYMBOL_SPRITES } from "./symbols";
import { tinted } from "./tint";
import type { MapObject } from "./types";

/** Draws one stamp, label or symbol of the map. */
export function drawObject(
  ctx: CanvasRenderingContext2D,
  o: MapObject,
  variant: number,
  images?: ImageTable,
  style = "",
) {
  const picture = o.kind === "image" ? objectImage(o, images) : undefined;
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
