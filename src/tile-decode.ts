import { mipChain, TILE } from "./materials";

export async function decodeTile(src: string) {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement("canvas");
  c.width = c.height = TILE;
  const ctx = c.getContext("2d")!;
  ctx.drawImage(img, 0, 0, TILE, TILE);
  const data = ctx.getImageData(0, 0, TILE, TILE).data,
    rgb = new Float32Array(TILE * TILE * 3);
  for (let i = 0; i < TILE * TILE; i++)
    for (let k = 0; k < 3; k++) rgb[i * 3 + k] = data[i * 4 + k];
  return mipChain(rgb, TILE, 3);
}
