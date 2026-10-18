export function floodFill(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  x: number,
  y: number,
  color: [number, number, number, number],
  tolerance = 32,
) {
  x = Math.floor(x);
  y = Math.floor(y);
  if (x < 0 || y < 0 || x >= width || y >= height) return;
  const start = (y * width + x) * 4,
    source = [data[start], data[start + 1], data[start + 2], data[start + 3]];
  if (source.every((n, i) => n === color[i])) return;
  const seen = new Uint8Array(width * height),
    queue = [y * width + x];
  for (let head = 0; head < queue.length; head++) {
    const i = queue[head];
    if (seen[i]) continue;
    seen[i] = 1;
    const offset = i * 4;
    if (source.some((c, n) => Math.abs(data[offset + n] - c) > tolerance))
      continue;
    data.set(color, offset);
    const px = i % width;
    if (px > 0 && !seen[i - 1]) queue.push(i - 1);
    if (px < width - 1 && !seen[i + 1]) queue.push(i + 1);
    if (i >= width && !seen[i - width]) queue.push(i - width);
    if (i < width * (height - 1) && !seen[i + width]) queue.push(i + width);
  }
}
