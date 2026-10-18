export interface FitSettings {
  removeBackground: boolean;
  tolerance: number;
  trim: boolean;
  parchment: boolean;
  outline: boolean;
  shadow: boolean;
  posterize: boolean;
}
export async function fitImage(
  source: Blob | string,
  settings: FitSettings,
): Promise<{ data: string; width: number; height: number }> {
  const url = typeof source === "string" ? source : URL.createObjectURL(source);
  try {
    const image = new Image();
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () =>
        reject(
          new Error(
            "This image could not be opened. Try a PNG, JPEG, or WebP.",
          ),
        );
      image.src = url;
    });
    const ratio = Math.min(
        1,
        1024 / Math.max(image.naturalWidth, image.naturalHeight),
      ),
      w = Math.max(1, Math.round(image.naturalWidth * ratio)),
      h = Math.max(1, Math.round(image.naturalHeight * ratio)),
      canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(image, 0, 0, w, h);
    const pixels = ctx.getImageData(0, 0, w, h),
      d = pixels.data;
    if (settings.removeBackground)
      removeBackgroundPixels(d, w, h, settings.tolerance);
    let left = w,
      right = 0,
      top = h,
      bottom = 0;
    for (let y = 0; y < h; y++)
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        if (!d[i + 3]) continue;
        if (settings.parchment) {
          const gray = 0.299 * d[i] + 0.587 * d[i + 1] + 0.114 * d[i + 2];
          d[i] = gray * 0.9;
          d[i + 1] = gray * 0.82;
          d[i + 2] = gray * 0.63;
        }
        if (settings.posterize)
          for (let c = 0; c < 3; c++) d[i + c] = Math.round(d[i + c] / 48) * 48;
        left = Math.min(left, x);
        right = Math.max(right, x);
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    ctx.putImageData(pixels, 0, 0);
    if (!settings.trim) {
      left = top = 0;
      right = w - 1;
      bottom = h - 1;
    }
    if (left > right)
      throw new Error(
        "Background removal removed the entire image. Lower the tolerance.",
      );
    const result = document.createElement("canvas"),
      padding = settings.shadow || settings.outline ? 12 : 1;
    result.width = right - left + 1 + padding * 2;
    result.height = bottom - top + 1 + padding * 2;
    const rc = result.getContext("2d")!;
    if (settings.shadow) {
      rc.shadowColor = "#231b14aa";
      rc.shadowBlur = 7;
      rc.shadowOffsetY = 4;
    }
    if (settings.outline) {
      rc.filter =
        "drop-shadow(1px 0px 0 #3a3021) drop-shadow(-1px 0px 0 #3a3021)";
    }
    rc.drawImage(
      canvas,
      left,
      top,
      right - left + 1,
      bottom - top + 1,
      padding,
      padding,
      right - left + 1,
      bottom - top + 1,
    );
    return {
      data: result.toDataURL("image/png"),
      width: result.width,
      height: result.height,
    };
  } finally {
    if (typeof source !== "string") URL.revokeObjectURL(url);
  }
}

export function removeBackgroundPixels(
  d: Uint8ClampedArray,
  w: number,
  h: number,
  tolerance: number,
) {
  const seen = new Uint8Array(w * h),
    queue: number[] = [];
  for (let x = 0; x < w; x++) {
    queue.push(x, (h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) queue.push(y * w, y * w + w - 1);
  const references = [0, (w - 1) * 4, (h - 1) * w * 4, (w * h - 1) * 4]
    .filter((i) => d[i + 3] > 30)
    .map((i) => [d[i], d[i + 1], d[i + 2]]);
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    if (i < 0 || i >= w * h || seen[i]) continue;
    seen[i] = 1;
    const k = i * 4;
    if (
      !references.some(
        (c) =>
          Math.hypot(d[k] - c[0], d[k + 1] - c[1], d[k + 2] - c[2]) <=
          tolerance * 4.41,
      ) &&
      d[k + 3] > 0
    )
      continue;
    d[k + 3] = 0;
    const x = i % w;
    if (x > 0) queue.push(i - 1);
    if (x < w - 1) queue.push(i + 1);
    if (i >= w) queue.push(i - w);
    if (i < w * (h - 1)) queue.push(i + w);
  }
}
