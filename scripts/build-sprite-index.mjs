// Builds data/sprite-index.json, the list of sprites the image search looks in
// first (see server-sprites.mjs). Run it again to pick up new icons:
//   npm run index:sprites
import { readFile, writeFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const GAME_ICONS =
  "https://data.jsdelivr.com/v1/packages/gh/game-icons/icons@master?structure=flat";
// Icons drawn inside a badge frame do not work as map stamps.
const SKIP_FOLDERS = new Set(["badges"]);

const response = await fetch(GAME_ICONS, {
  signal: AbortSignal.timeout(60000),
});
if (!response.ok) throw new Error(`jsDelivr returned ${response.status}.`);
const listing = await response.json();
const icons = listing.files
  .map((f) => /^\/([\w-]+)\/([\w-]+)\.svg$/.exec(f.name))
  .filter((m) => m && !SKIP_FOLDERS.has(m[1]))
  .map((m) => `${m[1]}/${m[2]}`)
  .sort();
if (icons.length < 1000)
  throw new Error(
    `Only ${icons.length} game-icons found; keeping the old index.`,
  );

const kenney = JSON.parse(
  await readFile(new URL("src/data/kenney.json", root), "utf8"),
).map(({ name, pack, source, src }) => ({ name, pack, source, src }));

const index = {
  generated: new Date().toISOString().slice(0, 10),
  gameIcons: {
    base: "https://cdn.jsdelivr.net/gh/game-icons/icons@master/",
    icons,
  },
  kenney,
};
await writeFile(
  new URL("data/sprite-index.json", root),
  JSON.stringify(index) + "\n",
);
console.log(
  `Indexed ${icons.length} game-icons and ${kenney.length} Kenney sprites.`,
);
