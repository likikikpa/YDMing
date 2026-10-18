import { mkdir, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";
const packs = [
  {
    key: "cartography",
    name: "Kenney Cartography",
    url: "https://kenney.nl/assets/cartography-pack",
    download:
      "https://kenney.nl/media/pages/assets/cartography-pack/2055ba99c2-1677578192/kenney_cartography-pack.zip",
    prefix: "PNG/Default/",
  },
  {
    key: "medieval",
    name: "Kenney Medieval RTS",
    url: "https://kenney.nl/assets/medieval-rts",
    download:
      "https://kenney.nl/media/pages/assets/medieval-rts/0863f2c62a-1677693589/kenney_medieval-rts.zip",
    prefix: "PNG/Default size/",
  },
];
const manifest = [];
for (const pack of packs) {
  const response = await fetch(pack.download);
  if (!response.ok)
    throw new Error(`${response.status} downloading ${pack.name}`);
  const files = unzipSync(new Uint8Array(await response.arrayBuffer()));
  const root = new URL(`../public/assets/${pack.key}/`, import.meta.url);
  await mkdir(root, { recursive: true });
  for (const [name, bytes] of Object.entries(files)) {
    if (!name.startsWith(pack.prefix) || !name.endsWith(".png")) continue;
    const filename = name.slice(name.lastIndexOf("/") + 1),
      label = filename
        .replace(".png", "")
        .replace(/([a-z])([A-Z])/g, "$1 $2")
        .replace(/_/g, " ")
        .replace(/^medieval/, "");
    await writeFile(new URL(filename, root), bytes);
    manifest.push({
      id: `kenney-${pack.key}-${filename}`,
      name: label,
      pack: pack.key,
      source: pack.url,
      src: `/assets/${pack.key}/${filename}`,
    });
  }
  await writeFile(new URL("License.txt", root), files["License.txt"]);
  console.log(
    `${pack.name}: ${manifest.filter((a) => a.pack === pack.key).length} sprites`,
  );
}
await writeFile(
  new URL("../src/data/kenney.json", import.meta.url),
  JSON.stringify(manifest),
);
