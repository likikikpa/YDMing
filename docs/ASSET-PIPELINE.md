# Making a stamp pack with an image model

How the Hand-inked and Pen-ink packs (48 stamps each) were made, so the next pack (another style, or more of the same) goes the same way. Everything is in the repo: the briefs in `scripts/pack-defs/`, the importer `scripts/import-sheets.py` and the cut-out code `scripts/lib_cutout.py`.

## Steps

1. **Brief.** `scripts/pack-defs/brief-common.txt` is the shared brief (one sheet of 3 × 2 separate objects on flat magenta, upright map-icon view, no ground, no shadow, light from the top left). `style-<name>.txt` is the style block. A new style is a new style block with the same object lists: `style-inked.txt` (colour wash) and `style-pen.txt` (black and white, for printing).
2. **Generate.** One image per sheet of six objects, using the image tool of the Codex CLI (`codex exec` with the brief on stdin; image files come back as PNG). Give a sheet that was approved as a reference to the sheets that follow it, so line weight and palette stay together. Do not attach other makers' maps or stamps as references.
3. **Look at every sheet** at full size and shrunk to 48 px. Reject and regenerate a sheet whose objects are cropped, merged, in the wrong view or in another hand.
4. **Define.** `scripts/pack-defs/<pack>.json` names each object (file key, label, tags) per sheet in reading order, and holds the licence text.
5. **Import.** `python3 -I scripts/import-sheets.py <pack> <folder of sheets>` cuts out the magenta, splits the sheet into its objects, trims, scales to 512 px, writes WebP files to `public/assets/<pack>/` and the Library list to `src/data/<pack>.json`. It warns about missing objects, objects touching the sheet edge and magenta left in a drawing. Fix warnings before going on.
6. **Register.** `src/packs.ts` (Library list and credit), `src/bundled-assets.ts` (pack folder), `vite.config.ts` (offline cache), and, for a style, `src/map-styles.ts` and the style registries the compiler lists.

## Black and white packs

A definition with `"mono": true` (Pen-ink) is converted to neutral grey on import. The brief must still ask for the right thing:

- **No colour, no grey wash**: pure black line and solid white interiors, with tone made by hatching and solid black. White interiors are opaque, so a stamp hides the ground under it.
- **Foliage must carry dark mass.** The first Pen-ink conifers had white boughs with an outline, and read as snow-covered. The brief now says trees and bushes are filled with dense hatching and solid shade, and only snow subjects stay white.
- **Look at the sheet in grey at 48 px** and measure it: after import every pixel of the pack is within 1 level of grey.

The Pen & ink style keeps the whole map neutral: the palette is white and greys (`style-palette-pen.ts`), the map's own colours (roads, walls, borders, river banks, names) go through `tone()` (`style-tone.ts`), stamps are not tinted and their contact shadow is black. A rendered map measured 0.000% of pixels with chroma above 3. Colours a user picks for a stroke are not changed.

## File names matter

The scatter brush and the generator sort a picture into a kind by its file name (`src/scatter-kinds.ts`): `tree-…` is a tree, `peak-`, `range-`, `hills-`, `mesa` are mountains, `boulders` and `rocks-` are rocks. A picture meant to be placed by hand only (a building, a ship, standing stones) must not start with one of these, or the generator will sow it over the land.

## What worked

- **Flat, quiet drawing beats rendered detail.** The first brief asked for hatching, wash and texture; the sheets came back with one fine speckled surface over foliage, stone and roofs. The second brief (`style-inked.txt`) asks for large shapes first, detail only where it explains the subject, flat tones with hard-edged shade, texture only from deliberate pen marks, and no glow, rim light, smoke or grain. Same objects, same model: calmer and closer to a hand-drawn atlas.
- **One object per stamp.** Villages and castles made of many buildings were the wrong stamps for a map editor; single universal objects can be combined by hand, and the generator can place them.
- **Cut-out.** Flood fill of the border magenta, then fade and despill of every pixel near the background or pinker than paint can be. Fine foliage is mostly edge pixels, so a plain colour key leaves a purple fringe.
- **Splitting.** Objects spill over the sheet's grid cells (a ship, an inn with its sign), so cells are not cropped; pieces that almost touch are joined and each chunk goes to the cell holding its centre.

## Known gaps in Hand-inked

- The hills, rocks and stones row is flatter and more cartoon-like than the mountains and trees.
- (Both packs) No palms, cacti, volcano, swamp plants, snowy conifers or bushes: the Hand-drawn style borrows the nearest picture for those biomes (see `DRAWN` in `src/style-decor.ts`).
- No dungeon, city-plan or interior pieces; dungeons and tiny symbols (wells, chests) still use the Kenney glyphs.
- Sheets were generated once; individual stamps were not retouched by hand.
