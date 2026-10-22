// Imports Mark Gosbell's "70+ Free Flat Greyscale Dungeon Assets" (CC0) from itch.io:
// the pictures go to public/assets/gosbell/, their list to src/data/gosbell.json.
// itch.io hands out a short-lived download link after a form post, so this asks
// for one the way the "Download" button does.
import { mkdir, writeFile } from "node:fs/promises";
import { unzipSync } from "fflate";
import { itchDownload, pngSize } from "./itch.mjs";

const PAGE =
  "https://markgosbell.itch.io/70-free-flat-greyscale-dungeon-assets";
// The ZIP among the page's two downloads (the other is a RAR of the same files).
const UPLOAD = 3788264;

// file in the ZIP, file name here, label. Effects, numbers and the 5x5 tiles are left out.
const KEEP = [
  ["Chair1x1", "chair", "Chair"],
  ["Pit1x1", "pit", "Pit"],
  ["Pitcircle1x1", "pit-round", "Round pit"],
  ["TableCircle1x1", "table-round", "Round table"],
  ["arrow1x1", "arrow", "Arrow"],
  ["barrel1x1", "barrel", "Barrel"],
  ["barreltwo1x1", "barrel-2", "Barrel 2"],
  ["bath1x2", "bath", "Bath"],
  ["bed1x2", "bed", "Bed"],
  ["beddouble2x2", "bed-double", "Double bed"],
  ["bedtwo1x2", "bed-2", "Bed 2"],
  ["bedtwodouble2x2", "bed-double-2", "Double bed 2"],
  ["book1x1", "book", "Book"],
  ["bookcase1x1", "bookcase", "Bookcase"],
  ["booktwo1x1", "book-2", "Book 2"],
  ["campfire1x1", "campfire", "Campfire"],
  ["campfiretwo1x1", "campfire-2", "Campfire 2"],
  ["chest1x1", "chest", "Chest"],
  ["chesttwo1x1", "chest-2", "Chest 2"],
  ["crate1x1", "crate", "Crate"],
  ["cratetwo1x1", "crate-2", "Crate 2"],
  ["door1x1", "door", "Door"],
  ["doorflip1x1", "door-flipped", "Door, flipped"],
  ["doortransparent1x1", "door-faint", "Door, faint"],
  ["doortransparentflip.1x1", "door-faint-flipped", "Door, faint, flipped"],
  ["dresser1x1", "dresser", "Dresser"],
  ["fire", "fire", "Fire"],
  ["hay1x1", "hay", "Hay"],
  ["hay2x2", "hay-large", "Hay, large"],
  ["opencrate1x1", "crate-open", "Open crate"],
  ["paper-pile1x1", "paper-pile", "Paper pile"],
  ["paper1x1", "paper", "Paper"],
  ["pot1x1", "pot", "Pot"],
  ["potplant1x1", "plant-pot", "Potted plant"],
  ["potplanttwo1x1", "plant-pot-2", "Potted plant 2"],
  ["sack1x1", "sack", "Sack"],
  ["sacktwo1x1", "sack-2", "Sack 2"],
  ["shelf1x1", "shelf", "Shelf"],
  ["stairs1x1", "stairs", "Stairs"],
  ["table1x1", "table", "Table"],
  ["table1x2-rough", "table-long-rough", "Long table, rough"],
  ["table1x2", "table-long", "Long table"],
  ["tableCircleRough1x1", "table-round-rough", "Round table, rough"],
  ["tableCircleRough2x2", "table-round-rough-large", "Large round table"],
  ["tableRough1x1", "table-rough", "Table, rough"],
  ["toilet1x1", "toilet", "Toilet"],
  ["treasurepile1x1", "treasure-pile", "Treasure pile"],
  ["treasurepile2x2", "treasure-pile-large", "Large treasure pile"],
  ["window1x1", "window", "Window"],
  ["windowtwo1x1", "window-2", "Window 2"],
];

const files = unzipSync(await itchDownload(PAGE, UPLOAD));

const root = new URL("../public/assets/gosbell/", import.meta.url);
await mkdir(root, { recursive: true });
const readme = files["README.txt"];
if (!readme || !/CC0/.test(new TextDecoder().decode(readme)))
  throw new Error("The pack no longer says it is CC0; check the licence first");
await writeFile(
  new URL("License.txt", root),
  new TextDecoder().decode(readme).replace(/^﻿|​/g, ""),
);

const manifest = [];
for (const [from, name, label] of KEEP) {
  const bytes = files[`${from}.png`];
  if (!bytes) throw new Error(`${from}.png is missing from the pack`);
  const [width, height] = pngSize(bytes);
  // "2x1" in the original name is how many grid squares the picture fills.
  const squares = from.match(/(\d)x(\d)/);
  await writeFile(new URL(`${name}.png`, root), bytes);
  manifest.push({
    id: `gosbell-${name}`,
    name: label,
    pack: "gosbell",
    source: PAGE,
    src: `/assets/gosbell/${name}.png`,
    aspect: Math.round((width / height) * 1000) / 1000,
    ...(squares && { cells: [Number(squares[1]), Number(squares[2])] }),
  });
}
await writeFile(
  new URL("../src/data/gosbell.json", import.meta.url),
  JSON.stringify(manifest),
);
console.log(`Mark Gosbell dungeon dressing: ${manifest.length} sprites`);
