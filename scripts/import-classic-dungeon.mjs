// Imports Mark Gosbell's "Classic Dungeon Map Symbols" (CC0) from itch.io:
// the pictures go to public/assets/classic-dungeon/, their list to
// src/data/classic-dungeon.json. The high resolution ZIP is used (300 px a
// grid square); the symbols are small, so the whole pack is about 500 KB.
import { mkdir, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { itchDownload, pngSize } from "./itch.mjs";

const PAGE = "https://markgosbell.itch.io/classic-dungeon-map-symbols";
// "Classic Dungeon Map Symbols - High Res.zip" (the page also offers RARs and a Low Res set).
const UPLOAD = 10815826;

const files = unzipSync(await itchDownload(PAGE, UPLOAD));
const names = Object.keys(files)
  .filter((n) => n.toLowerCase().endsWith(".png"))
  .sort();
if (!names.length) throw new Error("No pictures in the pack");
const licence = Object.keys(files).find((n) => /\.txt$/i.test(n));
if (licence && !/CC0/.test(new TextDecoder().decode(files[licence])))
  throw new Error("The pack no longer says it is CC0; check the licence first");

const root = new URL("../public/assets/classic-dungeon/", import.meta.url);
await mkdir(root, { recursive: true });
await writeFile(
  new URL("License.txt", root),
  "Classic Dungeon Map Symbols by Mark Gosbell, released under CC0 1.0 Universal.\n" +
    "Credit is optional.\n" +
    `${PAGE}\nhttps://creativecommons.org/publicdomain/zero/1.0/\n`,
);

// Names lose their "2x1" size tag; two pictures that then collide (TableSet2x1,
// TableSet3x1) keep it.
const stem = (path) =>
  path.slice(path.lastIndexOf("/") + 1).replace(/\.png$/i, "");
const plain = (path) =>
  stem(path).replace(/\d+x\d+/, "").replace(/_+/g, "_").replace(/^_|_$/g, "");
const taken = new Map();
for (const path of names) taken.set(plain(path), (taken.get(plain(path)) ?? 0) + 1);

const manifest = [];
for (const path of names) {
  const file = stem(path),
    // "TableLong2x1" is two squares wide and one tall.
    squares = file.match(/(\d)x(\d)/),
    base = taken.get(plain(path)) > 1 ? file.replace(/_+/g, "_") : plain(path),
    words = base
      .replace(/_/g, " ")
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .replace(/([a-wyzA-Z])(\d)/g, "$1 $2")
      .trim(),
    key = base
      .replace(/([a-z])([A-Z])/g, "$1-$2")
      .replace(/([a-wyzA-Z])(\d)/g, "$1-$2")
      .replace(/_/g, "-")
      .toLowerCase(),
    [width, height] = pngSize(files[path]),
    aspect = Math.round((width / height) * 1000) / 1000,
    cells = squares && [Number(squares[1]), Number(squares[2])];
  await writeFile(new URL(`${key}.png`, root), files[path]);
  manifest.push({
    id: `classic-dungeon-${key}`,
    name: words.charAt(0).toUpperCase() + words.slice(1).toLowerCase(),
    pack: "classic-dungeon",
    source: PAGE,
    src: `/assets/classic-dungeon/${key}.png`,
    aspect,
    // Only when the picture is shaped like the squares its name promises.
    ...(cells && Math.abs(aspect - cells[0] / cells[1]) < 0.05 && { cells }),
  });
}
const keys = new Set(manifest.map((m) => m.id));
if (keys.size !== manifest.length) throw new Error("Two pictures share a name");
await writeFile(
  new URL("../src/data/classic-dungeon.json", import.meta.url),
  JSON.stringify(manifest),
);
console.log(`Classic dungeon symbols: ${manifest.length} sprites`);
