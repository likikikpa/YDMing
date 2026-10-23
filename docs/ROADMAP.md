# Roadmap

Written 22 October 2026 after a review of an exported world map ("The Trottled world") and an interview with the owner. It lists what is being built, what comes next, and ideas that are not decided yet.

## The problem

Maps made in YDMing look plain next to Inkarnate:

- A map style only changes the ground colours, so the same stamp can sit on any ground. The AI_GEN pictures next to the Kenney line art next to a soft grass texture do not look like one map.
- There are few stamps, in few sizes. The main island of a 5600 × 4000 world held a few dozen, and most of the land was empty.
- Only three styles exist, and they differ by palette alone.
- The generator makes terrain and leaves the land empty.

## Decisions

- A map style is a **ground look plus a matching stamp set**. Choosing a style makes its set the default in the Library; other sets stay usable and are marked as not matching.
- Switching a map's style changes only the ground. Stamps already placed stay as they are.
- The old styles Parchment, Painted and Atlas are gone from the picker. Saved worlds and `.ydming` files that name one still load and are drawn in a replacement (Old ink for Parchment, Painted fantasy for Painted and Atlas), so they look different afterwards. A style name nothing knows also draws as Painted fantasy. There is no vector-drawn style: the Watercolour atlas that was planned for Atlas is dropped.
- New style code goes in new files; `terrain-render.ts` and `render.ts` are already too large.
- Preview builds are published as a Claude artifact named YDMing (see "Hosting the preview").

| Style           | Replaces  | Stamp set                                      | Ground                                                   |
| --------------- | --------- | ---------------------------------------------- | -------------------------------------------------------- |
| Painted fantasy | Painted   | AI_GEN pictures                                | Painted ground, coast glow, shaded relief, forest canopy |
| Old ink         | Parchment | Kenney Cartography (line art)                  | Sepia paper, ink shore and water lines, sepia relief     |
| Realistic       | none      | none (relief and canopy come from the terrain) | Photo ground (Poly Haven tiles that already ship)        |

## Being built: styles

Each step is its own commit, checked in screenshots at desktop and phone size, with zoom, pinch, a terrain stroke and a paint stroke measured before and after.

All seven steps are done: Painted fantasy, Old ink and Realistic. Each style owns a decoration set (`style-decor.ts`), coast lines (`style-coast.ts`), relief (`relief.ts`), frame and compass colours (`ornaments.ts`) and label look (`labels.ts`); a photo ground is a table in `style-ground.ts`. A new style adds an entry to each.

1. **Style system and Painted fantasy ground.** Done. A style registry (`map-styles.ts`: palette, stamp set, retired styles), the mapping of old styles on load, the Library marks, and Painted fantasy as the default for new maps. Painted is retired and draws as Painted fantasy.
2. **Coast glow and water depth.** Done. Turquoise shallows, a foam line and ripples along the shore.
3. **Shaded relief.** Done. A two-scale hillshade lit from the north-west, stronger on high ground.
4. **Forest canopy.** Done. Woods as clumps with clearings, drawn from the biome map, not as stamps.
5. **Frame, borders and labels.** Done, except fonts: a cream frame, a gold compass, a readable scale bar, and place names with a halo. Place names still use Georgia; a bundled open-licence display face is the next step here.
6. **Old ink.** Done. Pale paper ground with calmer texture, a heavy ink shore with water lines fading out to sea, a sepia relief wash, woods drawn as thinned clumps of the Kenney tree glyphs, a brown ink frame, compass and scale bar, italic place names, and paper that darkens towards its edges (not on dungeons). Parchment is retired and draws as Old ink. Not done: hatched slopes. A fine line pattern on the ground would need testing for shimmer when the map is shown smaller than its pixels. The Kenney glyphs are still black, not sepia; tinting them would need a tinted copy for the settlement symbols too.
7. **Realistic.** Done. The Poly Haven tiles that ship, each recoloured to a natural average colour (meadow from the forest floor, woods from leaf litter, sand, dirt, mossy rock, snow), with woods as a ground of their own on world maps; a strong north-west hillshade with cool shadows; a thin surf line and soft foam band in place of contour rings; a pale frame, compass and scale bar; nothing scattered over the land. Not done: desert, savanna and swamp still take the sand and meadow photos, since a ground per biome needs more tiles; the 128 px tiles go soft at high zoom; towns and cities are still Kenney line art.

## Found in the review

Each was reproduced and traced before any change (see Bugs in `CLAUDE.md`).

- **Scale bar labels sit between the ticks.** Fixed: the labels were one string padded with spaces in a proportional font; each number is now drawn over its own tick (`scale-bar.ts`).
- **Blocky coasts.** Fixed. Traced to the Terrain paint tool, not the generator: `buildGround` set every cell inside the brush circle to the ground's height, so the edge of each dab was whole cells, and it never read Edge hardness (the slider did nothing for ground painting). A shore painted on a 560 × 400 map wandered 0.92 of a cell (9 px in a 2x export). The edge is now a skirt by distance from the dab's centre (`ground-paint.ts`): 0.06 of a cell at the default hardness, and the slider works. The island tool's ragged edge is intended.
- **Stray outlines in open water.** Fixed for new worlds. Traced to the generator: its noise leaves single cells just above the sea, and low humps just under it, far from any island, and each gets its own shore line and rings of shallows. `tidyShore` (`shore-tidy.ts`) sinks land under 6 cells and landless banks up to 64 cells at the end of terrain generation. Worlds already made keep what they have, and generating again from the same seed now gives a slightly different world.
- **Possible seams in the ocean texture.** Confirmed and fixed. Hex tiling turned each patch of the water tile by a quarter turn, and the water tile is a single stripe direction, so stripes met sideways along straight lines. A tile whose detail lines up now takes half turns only (`hex-tiling.ts`); only water changes.
- **The scale bar is not tied to the map.** Not a rendering bug. Every map draws the same 185 px as 200 miles, so a Large world is about 3,000 miles wide and a Small one about 1,300, and a stamp stands for tens of miles. Tying the bar to a map needs a scale setting, which is under "A better world generator" below.
- **Uniform beach band.** Not a tool bug. The sand and dirt bands follow height, and the generator's coasts slope evenly, so the band is an even ring, frayed where the slope is gentle. It belongs to the biome work under "A better world generator" below.
- **Settlement symbols do not match the style.** Towns and cities are still Kenney line art on Painted fantasy, next to painted trees and peaks. The generator has no painted town picture to use yet.

## Done: more biomes

Nine biomes join the fourteen the generator knew: Badlands, Glacier, Steppe, Moorland, Autumn woods, Volcanic, Blighted, Mangrove and Coral reef (ids 14 to 22; saved maps store the id of each painted cell, so ids are only ever added at the end, see `biomes.ts`). The Biome tool paints them; the generator does not place them yet.

- Every style draws each biome its own way (`biome-grounds.ts`): the greens are no longer one colour, so taiga, forest, swamp, savanna and jungle differ, and tundra and desert stop borrowing dirt and sand. Painted fantasy and Old ink use patterns in the biome's palette colour; Realistic uses recoloured Poly Haven tiles (`style-ground.ts`), eight of them new.
- Lava is a pattern whose cracks glow orange (dark ink lines in Old ink), and in Realistic a cracked-mud tile whose dark cracks turn molten. A coral reef is painted on shallow water as heads of coral that fade out where the water deepens.
- Each biome grows its own pictures (`biome-decor.ts`) from the art that already ships: willows in swamp, mesas in badlands, snowy firs on glaciers, craters and boulders on volcanic ground, dead trees in blighted land, roots and palms in mangrove. A picture that a map did not need up front loads when first drawn.

Not done: the generator places none of the nine (see "A better world generator"); no slider sets how much of each appears; blighted and volcanic land have no sprites of their own beyond dead trees and craters; Realistic scatters nothing, so its biomes are told apart by ground alone.

## Done: photo textures in Terrain paint

The Terrain paint tool lists all 23 bundled Poly Haven photo textures under the project's own grounds. Picking one adds it to the world as a texture layer and selects it, so a world carries only the photos it uses; the "Photo textures" menu in the Layers panel is gone. A texture layer records the photo it came from (optional `preset`, checked on load), so a photo already in the world is not offered twice, and layers saved before that are matched by name and picture. Raise and Dig have no ground picker and are unchanged. The biome grounds (lava, coral and the rest) are not in this picker; the Biome brush paints them.

## Done: denser stamps with size variety (scatter brush)

Decided in an interview on 23 October 2026: a scatter brush inside the Stamp tool for world maps, drawing from a kind of picture (Mountains, Trees, Rocks, Undergrowth, taken from the open Library collection) or from a saved custom mix; one density slider; random size, flip, rotation and tint; an optional "follow biomes" toggle; desktop first. Steps:

1. **Placement logic.** Done: `scatter.ts`.
2. **The brush and its controls.** Done: a Scatter checkbox in the Stamp tool card (world maps only) with Pictures, Radius, Density, Size variety, Colour variety, Flip and Rotate (`scatter-brush.ts`, `scatter-kinds.ts`, `editor/scatter-tool.ts`, `layout/ScatterSettings.tsx`). A stroke is one undo step and redraws only the area it sowed. Picture stamps can carry an optional `tint` (`tint.ts`). A map file may now hold up to 200,000 stamps, up from 10,000.
3. **Follow biomes.** Done: a "Follow biomes" checkbox, on by default (`scatter-habitat.ts`). Each stamp takes its picture from those that grow on the biome under it, using the pools the map styles scatter (`style-decor.ts`), and nothing is placed on the sea or the reef. Trees, undergrowth and mountains keep to their biomes (pines on taiga, acacias on savanna, snowy peaks on snow and rock, desert ranges and mesas on desert and badlands, rocky peaks on grass, forest and highland, volcanoes on volcanic land; palms and stones on a beach); stones stand on any land; a picture no style scatters (a castle, a log, an imported stamp) can stand anywhere on land. Rivers and lakes drawn as paths, and roads, are not avoided.
4. **Custom mixes.** Done: New mix in the Scatter card opens a dialog where you name a mix, pick pictures from any bundled collection and give each a weight from 1 to 10. Saved mixes are listed under Mixes in the Pictures menu, can be edited or deleted, and travel with the world (optional `Project.scatterMixes`, checked on load). Each picture in a mix can be given its own biomes (the leaf button on its row), which replace the built-in rules for it; without a choice of its own it follows the rules, and a mix whose pictures grow nowhere under the brush places nothing. A mix can hold My stamps and searched images too: their pictures and credits are saved in the world with the mix (`image:` items, see `scatter-mixes.ts`). Each picture turns only as far as its own kind allows, so a mix of trees and rocks keeps the trees upright.
5. **Large-count checks.** Done on desktop and with a phone-size touch test, using the production build in headless Chromium (software drawing, so only the comparison between runs means much; the dev server adds seconds of React logging and is no guide).

   | Stamps on the map | Open file | Scatter stroke | Paste of all | Undo | Redo |
   | ----------------- | --------- | -------------- | ------------ | ---- | ---- |
   | 20,000            | 6.5 s     | 61 ms a move   | 0.4 s freeze | 0.2 s | 0.3 s |
   | 60,000            | 11.5 s    | 78 ms a move   | 1.2 s freeze | 0.8 s | 1.1 s |
   | 130,000           | 20 s      | 91 ms a move   | 2.5 s freeze | 1.9 s | 2.6 s |

   Nothing throws at 130,000 stamps (the old list-spread limit is about 120,000). Zoom and pan stay smooth. A scatter stroke redraws only the ground it sowed, so its cost follows the stamps near the brush, not the whole map; the time per move is the drawing of the stamps in that area. Found and fixed: after every edit the editor redrew the whole map a second time once the pictures "finished loading", though they were already loaded (`useEditorLifecycle.ts`); undo and redo at 20,000 stamps went from 0.4 and 0.7 s to 0.2 and 0.4 s, with no change measured at 60,000. A marquee cannot start on a stamp, so on a map that is covered edge to edge it can only start from an empty margin. A file holds about 240 bytes a stamp, so the 60 MB open limit is reached near 250,000, above the 200,000 stamps a map may hold.

   Phone (412 × 860, touch): a one-finger drag scatters (40 stamps for a 30-step stroke, no long task over 55 ms); two fingers landing together, or a second finger landing 60 ms after the first, place nothing. Not measured on a real phone, and not with tens of thousands of stamps.

   **Loose ends: done** (24 October 2026) — a Keep off paths checkbox (on by default) keeps stamps off rivers, roads, walls and corridors, within a quarter of the stamp size of the line (`scatter-paths.ts`, a grid of segments built once per stroke; in a test over 2,267 segments 318 of 1,297 stamps landed within 12 px of a path with it off, 1 of 1,000 with it on); the Scatter card fits a 412 × 860 phone (paired sliders, two-column checkboxes). Picture stamps now draw without a canvas save and restore each (`object-render.ts`), which was the largest cost of a full redraw; at 60,000 stamps, over one run before and two after, a scatter stroke went from 80 to 58-63 ms a move, a paste of all from 2.3 to 1.5-1.6 s of freeze and undo from 0.96 to 0.70-0.88 s; redo showed no clear change (1.16 s before, 1.00 and 1.43 s after) and zoom none. The remaining cost of a paste is the redraw itself, one drawImage per stamp. Left as it is: a marquee still cannot start on a stamp, and the preview has had no test on a real phone.

## Next: a better world generator

- Coasts: smooth, varied shorelines; bays, capes, small islands near large ones.
- Biomes that follow height, latitude and rainfall: snow only on high ground or far north, grassland between, desert in rain shadows. Today snow patches sit on flat lowland.
- Place the nine painted-only biomes: volcanic land around volcano peaks, badlands in rain shadows and on high dry ground, glaciers in the far north and on the highest peaks, steppe between grassland and desert, moorland on cool highland, mangrove and coral reef on warm shores, autumn woods at the edge of the cold. A slider per special biome (volcanic activity, blight) would set how much of each appears.
- Transitions between biomes instead of hard-edged blobs; rock around peaks, not around every snow patch.
- Beaches of varied width: wide on gentle shores, none on cliffs, instead of an even ring round every coast.
- Rivers that start in the hills and reach the sea or a lake.
- Population: settlements, roads, forests, hills and mountain ranges placed from the terrain with the active style's stamp set, so a generated map is not empty.
- A scale-aware map: the generator and the scale bar agree on how many miles the map is.

## Ideas, not decided

Pick from these; none is started.

- **Player view.** A link or export that shows a map with the fog of war applied and the DM's notes and hidden stamps removed.
- **VTT export.** A Universal VTT (`.dd2vtt`) file with walls, doors and lights from dungeon maps, for Foundry, Roll20 and others.
- **Travel layer.** Distance and travel time between two points, using the map scale and a pace; a route can be saved on the map.
- **Political layer.** Kingdoms painted as regions with borders and names, filled from the generator's capitals.
- **Seasons and weather.** A winter or autumn variant of a style that retints the ground and swaps tree stamps; light clouds and fog over the map.
- **Curved labels.** Region and river names that follow a path.
- **Print and tile export.** A large map cut into printable pages, or a battle map of one area at grid scale.
- **Hex overlay for world maps** with terrain per hex for hex crawls.
- **Animated water** in the viewer, not in exports.
- **Style packs.** A bundle of ground, palette and stamp set that a user can import, like stamp packs today.

## Hosting the preview

The preview is a Claude artifact named YDMing, separate from the older Atlasforge one. It is a build made as `CLAUDE.md` describes under Previews: relative base, no service worker, absolute `/assets/` and `/fonts/` paths rewritten, and no image search. Those changes are never committed to the app.

An artifact version holds at most 511 files and 256 MB, and one publish sends at most 255 files. `public/` already holds about 480 files, so the preview ships only the packs the styles need, and new art should be code rather than image files where it can be. The published preview holds 505 of those 511 files, so there is room for six more: further photo tiles or pictures need packs left out of the preview, or art that is code.
