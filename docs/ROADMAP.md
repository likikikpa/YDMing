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
- The old styles (Parchment, Atlas, Painted) are replaced. Each leaves the picker when its replacement lands. Saved worlds and `.ydming` files that name an old style still load and are mapped to the replacement, so they look different afterwards.
- New style code goes in new files; `terrain-render.ts` and `render.ts` are already too large.
- Preview builds are published as a Claude artifact named YDMing (see "Hosting the preview").

| Style             | Replaces  | Stamp set                                           | Ground                                                   |
| ----------------- | --------- | --------------------------------------------------- | -------------------------------------------------------- |
| Painted fantasy   | Painted   | AI_GEN pictures                                     | Painted ground, coast glow, shaded relief, forest canopy |
| Old ink           | Parchment | Kenney Cartography (line art)                       | Sepia paper, ink shore and water lines, sepia relief     |
| Watercolour atlas | Atlas     | New procedural vector sprites, outlined and hatched | Washed colour, soft edges                                |
| Realistic         | none      | none (relief and canopy come from the terrain)      | Photo ground (Poly Haven tiles that already ship)        |

## Being built: styles

Each step is its own commit, checked in screenshots at desktop and phone size, with zoom, pinch, a terrain stroke and a paint stroke measured before and after.

Steps 1 to 6 are done (Painted fantasy and Old ink). Each style owns a decoration set (`style-decor.ts`), coast lines (`style-coast.ts`), relief (`relief.ts`), frame and compass colours (`ornaments.ts`) and label look (`labels.ts`); the next styles add an entry to each.

1. **Style system and Painted fantasy ground.** Done. A style registry (`map-styles.ts`: palette, stamp set, retired styles), the mapping of old styles on load, the Library marks, and Painted fantasy as the default for new maps. Painted is retired and draws as Painted fantasy.
2. **Coast glow and water depth.** Done. Turquoise shallows, a foam line and ripples along the shore.
3. **Shaded relief.** Done. A two-scale hillshade lit from the north-west, stronger on high ground.
4. **Forest canopy.** Done. Woods as clumps with clearings, drawn from the biome map, not as stamps.
5. **Frame, borders and labels.** Done, except fonts: a cream frame, a gold compass, a readable scale bar, and place names with a halo. Place names still use Georgia; a bundled open-licence display face is the next step here.
6. **Old ink.** Done. Pale paper ground with calmer texture, a heavy ink shore with water lines fading out to sea, a sepia relief wash, woods drawn as thinned clumps of the Kenney tree glyphs, a brown ink frame, compass and scale bar, italic place names, and paper that darkens towards its edges (not on dungeons). Parchment is retired and draws as Old ink. Not done: hatched slopes. A fine line pattern on the ground would need testing for shimmer when the map is shown smaller than its pixels. The Kenney glyphs are still black, not sepia; tinting them would need a tinted copy for the settlement symbols too.
7. **Watercolour atlas.** The procedural vector sprites (trees, hills, ridges, forests drawn in code, in many sizes) and washed ground.
8. **Realistic.** Photo ground and relief; no symbols.

Procedural sprites add no files, which matters for the preview limit below.

## Fix first (found in the review, causes not traced yet)

Each needs reproducing before any change (see Bugs in `CLAUDE.md`).

- **Scale bar labels sit between the ticks.** Fixed: the labels were one string padded with spaces in a proportional font; each number is now drawn over its own tick (`scale-bar.ts`).
- **Settlement symbols do not match the style.** Towns and cities are still Kenney line art on Painted fantasy, next to painted trees and peaks. The generator has no painted town picture to use yet.
- **The scale bar is not tied to the map.** It is always 185 map units labelled 200 miles, so every world map is about 3,000 miles wide whatever it holds. A stamp then stands for tens of miles.
- **Stray outlines in open water.** Faint coast outlines with no land under them east of the main island, loose fragments of the shore line off the south tip, and small detached sand specks off the east coast. They look like land that was erased but left its outline.
- **Blocky coasts.** The main island's coast is stair-stepped and the east coast runs ruler-straight for hundreds of pixels; the small island's coast is smooth. The land mask looks like it comes from different resolutions.
- **Uniform beach band.** The sand and dirt bands are an even-width ring that follows the whole coast, frayed into noise on one side.
- **Possible seams in the ocean texture.** Straight rectangular breaks in the wave pattern in a few crops. Unconfirmed; check at 100% in the app.

## Next: denser stamps with size variety

- A scatter tool: paint an area, choose a kind and a density, and it fills the area with stamps.
- Random size, flip, rotation and tint within a range per kind, so a forest is not a grid of equal trees.
- Mixing several pictures of a kind: the AI_GEN set has about 20 trees, one volcano and one mesa, which repeat visibly.
- Biome-aware placement: pines on taiga and snow, palms on beach and jungle, none on water.
- Large counts: copy and paste already doubles a map's stamps. Never spread a list into a call, and look ids up through `idSet` (see Performance in `CLAUDE.md`).
- Phones: thousands of stamps must stay smooth, so measure before and after.

## Next: a better world generator

- Coasts: smooth, varied shorelines; bays, capes, small islands near large ones.
- Biomes that follow height, latitude and rainfall: snow only on high ground or far north, grassland between, desert in rain shadows. Today snow patches sit on flat lowland.
- Transitions between biomes instead of hard-edged blobs; rock around peaks, not around every snow patch.
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

An artifact version holds at most 511 files and 256 MB, and one publish sends at most 255 files. `public/` already holds about 480 files, so the preview ships only the packs the styles need, and new art should be code rather than image files where it can be.
