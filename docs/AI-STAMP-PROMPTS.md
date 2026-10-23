# Prompts for more AI stamp packs and textures

Written 23 October 2026 for ChatGPT's image model. Everything below is copy-paste. Nothing here assumes more than: it reads a long prompt, keeps a style across a chat, and makes images of at least 1536×1024.

## What the app has and what it lacks

The generated world map is flat terrain colour with soft contour lines. Its mountains, towns and trees are thin procedural pen-and-ink icons, about 20–40 px wide on screen. They are the weakest part of the picture, so replacing them with good stamps changes the look more than anything else.

| Map style in the app | Look                            | Pack style that fits it                                                       |
| -------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Parchment            | pale, muted greens, cream sea   | **Ink**                                                                       |
| Painted              | saturated greens, deep blue sea | **Fantasy** (painted, a little like Inkarnate's world maps) and **Realistic** |
| Atlas                | teal sea, deep green land       | **Atlas**                                                                     |

Already in the Library:

- **AI_GEN (68):** 20 trees, 12 mountains/hills/rocks, and 12 each of city, dungeon and forest pieces. Glossy game-asset look, dark brown outline, saturated. No settlements, castles, ruins, ships, sea monsters, doors, stairs, traps, furniture, forest clumps, or map decoration.
- Kenney (flat, simple), Gosbell (flat greyscale dungeon), Classic dungeon symbols (black and white), Amanz (black silhouettes).
- **Textures:** 15 photographic Poly Haven tiles. They clash with the painted terrain, and there are no dungeon floors, no ink patterns and no painted ground.

Facts about the app that shape the prompts:

- A stamp is shown small, so the silhouette must read at 40 px. Bold shapes, few details, outline at least 3% of the width.
- Stamps rotate and overlap, so no long cast shadow baked in.
- A texture tile is shrunk to a **square 128×128** and repeats every 48 map px. It needs big, even, low-contrast features, no focal point and no vignette.
- A cover image (unveiled by painting) may be up to 2048 px and does not tile.
- Dungeon sprites can fill grid squares exactly, so dungeon pieces are drawn to fill their footprint edge to edge.
- A map with tens of thousands of stamps is slow. **Forest and village clumps** (one stamp, many trees) cut the object count, so they come first.
- Import takes up to 600 pictures per pack, 10 MB each, 150 MB in total. Names come from file names: `oak-dense.png` becomes "oak dense".

Do not put "Inkarnate" or any artist or product name in a prompt. The Fantasy block below describes the look in plain words.

## Roadmap, most needed first

| #   | Pack                                                                                     | Count            | Why now                                            |
| --- | ---------------------------------------------------------------------------------------- | ---------------- | -------------------------------------------------- |
| 1   | **F2 Fantasy forests and clumps**                                                        | 24               | Biggest area on every map; fewer objects           |
| 2   | **F3 Fantasy settlements and sites**                                                     | 36               | Towns, castles and ruins are what a DM places most |
| 3   | **F1 Fantasy mountains and hills**                                                       | 18               | Replaces the procedural peaks                      |
| 4   | **I1 Ink terrain** and **I2 Ink sites**                                                  | 36 + 36          | Gives Parchment maps real art                      |
| 5   | **T1 Fantasy ground textures** and **T2 Ink patterns**                                   | 24 + 12          | Terrain that matches the stamps                    |
| 6   | **F6 Fantasy city (top-down)**                                                           | 30               | City maps have only 3 roofs                        |
| 7   | **F7 Fantasy dungeon**                                                                   | 48               | No painted doors, stairs, traps, furniture         |
| 8   | **R3 Realistic dungeon and interior**, **R2 Realistic buildings**, **T3 Dungeon floors** | 48 + 30 + 12     | Battle-map look                                    |
| 9   | **F4 Sea and map dressing**, **I3 Ink sea and dressing**, **F5 Scatter**                 | 24 + 24 + 18     | Polish                                             |
| 10  | **A1 Atlas world symbols**, **A2 Atlas sea and ornaments**, **T4 Atlas washes**          | 36 + 18 + 12     | The smaller style                                  |
| 11  | **R1 Wilderness top-down**, **R4 World aerial**, **I4 Ink city plan**, **T5 Covers**     | 36 + 18 + 30 + 4 | Last                                               |

About 510 stamps, 60 tiles and 4 covers in all. Do one pack, look at it in the app, then the next.

## How to work

1. **One chat per style.** Open a new chat, paste the setup prompt (the shared rules plus that style's block), and wait for "ready". Then paste one sheet prompt at a time.
2. **Attach references.** In the Fantasy chat, attach two good existing AI_GEN pictures (for example `tree-oak.webp` and `city-oak.webp`). After the first approved sheet of a pack, attach it to the next prompt.
3. **Look at each sheet at 40 px wide** (zoom the browser out or shrink the image). If you cannot tell what an object is, regenerate that sheet.
4. Items marked ★ are big or important: generate each alone on a 1024×1024 or larger magenta canvas, using the same style block.
5. Run the cut-out prompt at the end of this file on each batch of sheets, then **Import pack** in My stamps (or send the ZIP and it can be bundled as a new Library collection).
6. Name ZIPs `ai-fantasy-forests.zip`, `ai-ink-sites.zip`, and so on.

## Shared rules (every style)

```text
OUTPUT RULES, applied to every image in this chat:
- One sheet per image: 3 columns x 2 rows = 6 separate objects, each centred in its own equal cell with at least 8% empty margin on every side. Nothing touches or overlaps another object or the cell edge. Wide objects (ranges, walls) use the full width of their cell.
- Background: one flat pure magenta (#FF00FF). No gradient, no texture, no ground, no shadow on the background, no frame, no text, no numbers, no labels, no watermark. Magenta must not appear inside any object.
- Every object is one complete, isolated, uncropped stamp with a hard, clean, slightly anti-aliased edge. No glow, no haze, no semi-transparency, no motion blur, no long cast shadow.
- Light comes from the top-left on every object.
- All objects in one sheet share the same scale unless the list says otherwise.
- The objects must read at 40 px wide: strong silhouette, simplified detail, no hairline strokes.
- Canvas 1536x1024 or larger.
- After each image, list the six objects in reading order (left to right, top to bottom) with the file names I gave.
Reply only "ready" until I send a sheet.
```

## Style blocks

Paste the shared rules, then one of these, in the first message of a chat.

### Fantasy (painted, Inkarnate-like)

```text
STYLE: fantasy world-map symbols, hand-painted digital illustration. Friendly, saturated but natural colour. A clean dark-brown outline (about 3% of the object's width, a little thicker on the shaded side, never pure black). Soft three-tone cel shading (light, mid, shade) with a faint painterly texture and small bright highlights. Shaded side is bottom-right.
Overland objects (trees, mountains, buildings, towers, ships) are drawn in a three-quarter "map view": seen from slightly above with front faces visible, like an illustrated fantasy map. Not flat top-down, not isometric.
Objects marked "top-down" are seen straight from above (roofs, canopies, furniture) with the same outline and shading.
Palette: leaf green #4F7F3A to #9DBE4A, warm stone grey #8E8A80, earth brown #8A5B35, terracotta roofs #B5523B, slate blue-grey roofs, snow #F2F5F7 with blue-grey shade, small accents of gold and red banners.
Chunky, readable, slightly exaggerated shapes. Group small details into masses.
```

### Ink (pen and ink on parchment)

```text
STYLE: pen-and-ink map symbols drawn with a dip pen. One warm near-black sepia ink (#2B2118), one consistent line weight (outline about 3% of the object's width, inner details thinner). No colour except an optional very light cream wash (#F1E7CF) that fills every closed shape so the symbol is opaque and readable over green or blue ground. Shading only by short parallel hatching and cross-hatching on the bottom-right side and fine stippling; no grey fills, no gradients. A slight hand wobble and tapering line ends.
Overland objects use a classic old-atlas profile or three-quarter view: mountains as ridged peaks with a hatched flank, trees as a trunk with a scalloped crown, buildings with a visible front and roof. Objects marked "top-down" are seen from above.
Use few bold strokes. No dense fine clutter.
```

### Realistic (painted, battle-map quality)

```text
STYLE: realistic digital painting at battle-map quality. Believable materials (stone with pores and cracks, wood grain, moss, damp, rust, thatch fibres), natural muted colour with subtle variation, soft ambient occlusion where parts meet, no outline, no cartoon shading, no cel steps.
Camera: straight top-down orthographic for every object, so trees show only their canopy, towers only their roof, furniture only its top. Lighting is even and diffuse; only a faint soft shadow right at the contact edge. No long cast shadow.
Rich detail, but the silhouette stays clear and simple.
```

### Atlas (printed atlas, hand-coloured)

```text
STYLE: printed-atlas map symbols, hand-coloured engraving. Calm, clean and precise. A thin dark slate-blue outline (#2F3B4A, about 2% of the object's width). Flat watercolour fills in two or three muted tones per object, only a very faint wash, a hint of paper grain. Fine engraved hatching on the bottom-right side.
Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, slate roofs #5C6B7A, brick accent #A8573F.
Oblique atlas view: mountains as shaded ridge profiles, towns as small clustered houses, castles in profile. Flat and graphic.
```

## Fantasy packs

Start each sheet with its name, for example "Sheet F2-1". Write the items as a numbered list.

### F2 Forests and clumps (24, four sheets)

A clump is several trees drawn together as one object with an irregular, organic outline and no ground under it.

```text
Sheet F2-1: temperate clumps, three-quarter map view. Small = 3 trees, medium = 7, dense = 15 trees packed into a rounded blob.
1. oak-small  2. oak-medium  3. oak-dense  4. mixed-medium  5. birch-medium  6. orchard (rows of fruit trees with a few red and yellow fruits)
```

```text
Sheet F2-2: conifer and cold clumps.
1. pine-small  2. pine-medium  3. pine-dense  4. snow-spruce-small  5. snow-spruce-dense  6. dead-trees (bare grey trees, 7 of them)
```

```text
Sheet F2-3: warm and wet clumps.
1. autumn-medium (orange, red, gold)  2. autumn-dense  3. jungle-dense (broad leaves, vines, a few flowers)  4. palm-grove  5. mangrove-swamp (roots in murky water, reeds)  6. bamboo
```

```text
Sheet F2-4: fantasy clumps and landmarks. Items 2 and 3 are single trees, drawn about 3 times the size of one tree in the other sheets.
1. enchanted (blue-violet foliage with soft glowing motes)  2. ancient-giant-tree (huge trunk, wide crown, a small door in the trunk)  3. redwood-giants (three very tall trunks)  4. twisted-dark (black-green gnarled trees, thorny)  5. crystal-trees (trees with translucent teal crystal leaves)  6. blossom (pink and white blossoming trees, falling petals)
```

### F3 Settlements and sites (36, six sheets)

Three-quarter map view. Within a sheet keep the order small to large in size.

```text
Sheet F3-1: settlements.
1. hamlet (3 cottages, one tree)  2. village (7 houses around a well, a small field)  3. farmstead (barn, farmhouse, haystacks, fence)  4. town (dense houses, a church with a spire, a market square)  5. walled-town (a ring of low stone wall with two towers and a gate)  6. windmill (stone windmill with sails, a few sacks, a little field)
```

```text
Sheet F3-2: cities and ports. Make these the largest objects on the sheet; items 1 and 2 are star items, so also generate them alone.
1. city (many roofs, a cathedral, two towers, a square, no wall) ★  2. walled-city (heavy wall ring, gatehouses, a keep on a hill, a river gate) ★  3. port-town (quay, warehouses, two small ships, a crane)  4. port-city (stone harbour, lighthouse, three ships, big warehouses)  5. crossroads-inn (an inn with a sign board shape but no text, stable, wagon)  6. market-town (a wide square full of striped stalls, a clock tower)
```

```text
Sheet F3-3: castles and towers.
1. castle-small (square keep, four round towers, a banner)  2. castle-large (concentric walls, many towers, a gatehouse, red banners) ★  3. fortress-cliff (a fortress cut into a rocky cliff)  4. keep-tower (one square stone keep with a flag)  5. watchtower (tall thin stone tower with a fire basket)  6. wizard-tower (tall twisted tower with a glowing blue top and floating stones)
```

```text
Sheet F3-4: religion and coast.
1. temple (columned temple with a pediment)  2. monastery (cloister, bell tower, on a small hill)  3. cathedral (large cruciform church, flying buttresses)  4. lighthouse (white-and-red tower on a rock, light beam as painted glow)  5. palisade-fort (wooden wall, wooden towers, tents inside)  6. citadel (white city fortress built up a steep cliff in terraces) ★
```

```text
Sheet F3-5: adventure sites.
1. ruins-town (broken walls and roofless houses, weeds)  2. ruins-tower (a half-fallen tower with ivy)  3. cave-entrance (a dark cave mouth in a rock face with a few bones)  4. dungeon-gate (an old carved stone door set into a green hillside)  5. mine-entrance (timber frame, rails, a cart, a spoil heap)  6. standing-stones (a ring of seven stones, one fallen, a flat altar stone)
```

```text
Sheet F3-6: more sites.
1. shrine (small roofed shrine with candles and flowers)  2. graveyard (crooked headstones, a crypt, a dead tree, an iron fence)  3. dragon-lair (a scorched hill with a cave, huge bones, a gold glint)  4. bandit-camp (patched tents, a campfire, a stolen cart, a skull banner)  5. battlefield (broken spears, torn banners, a fallen siege tower)  6. obelisk (a tall rune-carved obelisk with a faint glow, on a stone platform)
```

### F1 Mountains and hills (18, three sheets)

AI_GEN already has rocky peak, desert range, snowy peak and range, green hills and ridge, mesa, butte, volcano and crater. Do not repeat those.

```text
Sheet F1-1: green mountains. Items 4 and 5 are wide (about 2 times wider than tall).
1. single-green (one green-grey peak with a small snow cap)  2. single-snow (tall, snow to halfway)  3. pair (two peaks, one behind the other)  4. range-green (five peaks, forested foothills)  5. range-snow (five snowy peaks)  6. spire (tall thin jagged spire, vertical)
```

```text
Sheet F1-2: biome mountains.
1. desert-red (red sandstone peaks)  2. desert-range (wide, 4 sandstone peaks, wind-carved)  3. ash (black-grey jagged peaks with a red glow in the cracks)  4. volcano-smoking (a cone with smoke and lava running down)  5. glacier (blue-white ice peaks, crevasses)  6. karst (tall green limestone towers wrapped in mist, jungle on top)
```

```text
Sheet F1-3: hills and mounds. Item 2 is wide.
1. hills-small (two grassy mounds)  2. hills-wide (a row of three rolling hills with a path)  3. hills-rocky (grey rock showing through grass and scrub)  4. hills-dry (golden dry grass hills)  5. hills-snow (white rolling hills, a few firs)  6. barrow (a grassy burial mound with a stone doorway and two standing stones)
```

### F6 Fantasy city, top-down (30, five sheets)

Top-down, no tilt. Every roof shows ridge lines, tiles or straw, a chimney or two, and a faint dark edge. No ground.

```text
Sheet F6-1: houses. Roof is the only thing visible. Same scale, small houses.
1. house-small-terracotta  2. house-small-slate  3. house-small-thatch  4. house-small-wood-shingle  5. house-L-terracotta  6. longhouse-thatch
```

```text
Sheet F6-2: larger buildings.
1. hall-gabled (long hall with a cross-gable)  2. mansion-U (a U-shaped mansion with a small garden court in the middle)  3. guildhall-courtyard (a square building around a courtyard with a tree)  4. tavern (L-shaped, a chimney, a barrel stack at the side)  5. warehouse (big plain roof with a roof hatch)  6. barn-stable (barn roof joined to an open stable yard)
```

```text
Sheet F6-3: towers and religion.
1. tower-round (a conical roof)  2. tower-square (a pyramid roof)  3. church-cruciform (cross-shaped roof with a small spire)  4. temple-dome (a domed roof with a ring of columns)  5. chapel-small  6. windmill-top (four sails seen from above)
```

```text
Sheet F6-4: street props.
1. stall-blue  2. stall-yellow  3. well-stone (with a small wooden roof)  4. statue-plinth (a stone square with a hero statue seen from above)  5. gazebo (a hexagonal roof)  6. market-crates (stacked crates, sacks, a handcart)
```

```text
Sheet F6-5: bridges and walls. Parts seen from above; the water and road are NOT drawn, only the structure. Items 1 and 2 are wide.
1. bridge-stone-arch (stone bridge, 3 times as long as wide, low parapets)  2. bridge-wood (wooden plank bridge with rope rails)  3. gatehouse (twin towers and a gate arch with a portcullis)  4. wall-tower-round  5. wall-tower-square  6. wall-corner (a round corner tower with the wall running two directions)
```

### F7 Fantasy dungeon, top-down (48, eight sheets)

Each piece is drawn in the proportions of its footprint and fills it edge to edge, so it lines up with the grid. 1x1 is one square, 2x1 two squares wide and one deep. Pieces carry no floor, except pits, pools and chasms, which include their hole.

```text
Sheet F7-1: doors.
1. door-wood-1x1 (closed)  2. door-wood-open-1x1  3. door-iron-1x1 (studded, a lock)  4. door-double-2x1  5. door-secret-bookcase-2x1 (a bookcase that is slightly ajar)  6. portcullis-1x1
```

```text
Sheet F7-2: stairs and levels.
1. stairs-down-1x2  2. stairs-up-1x2  3. stairs-spiral-2x2  4. ladder-1x1 (seen from above, going down a dark hole)  5. ramp-1x2  6. trapdoor-1x1
```

```text
Sheet F7-3: traps.
1. spike-pit-1x1 (open pit with spikes)  2. covered-pit-1x1 (loose boards over a pit)  3. pressure-plate-1x1  4. rune-circle-2x2 (a glowing magic circle)  5. dart-wall-2x1 (a wall with small holes and a thin tripwire)  6. rolling-boulder-2x2 (a round boulder with scrape marks behind it)
```

```text
Sheet F7-4: features.
1. altar-2x1  2. sarcophagus-1x2  3. statue-1x1 (a knight statue on a plinth)  4. throne-1x1  5. brazier-1x1 (burning)  6. cauldron-1x1 (green bubbling liquid)
```

```text
Sheet F7-5: loot and remains.
1. chest-closed-1x1  2. chest-open-1x1 (gold inside)  3. coins-pile-1x1  4. gems-pile-1x1  5. skeleton-1x1 (lying down, a rusty sword)  6. weapon-rack-2x1
```

```text
Sheet F7-6: water and hazards. These have a soft organic edge instead of a square one.
1. water-pool-2x2  2. lava-pool-2x2  3. rope-bridge-1x3 (over a chasm, the chasm is drawn at its sides as a dark edge)  4. chasm-edge-2x2 (a dark hole with broken rock edges)  5. spiderweb-2x2  6. blood-altar-2x2 (a stained sacrificial slab with candles)
```

```text
Sheet F7-7: rooms and furniture, medieval.
1. table-long-1x3  2. table-round-2x2  3. bar-counter-1x3  4. bed-1x2  5. bunk-bed-1x2  6. fireplace-2x1
```

```text
Sheet F7-8: more furniture.
1. bookshelf-1x2  2. desk-1x2 (papers, a candle)  3. barrels-2x2 (a stack of barrels)  4. crates-2x2  5. rug-2x3 (a worn red rug)  6. wardrobe-1x2
```

### F4 Sea and map dressing (24, four sheets)

Dressing is drawn blank: no words anywhere.

```text
Sheet F4-1: ships. Three-quarter view, all facing right, same scale.
1. galleon  2. cog (a small trade ship)  3. longship (a dragon prow, a striped sail)  4. rowboat  5. war-galley  6. ghost-ship (torn grey sails, a sea-green glow)
```

```text
Sheet F4-2: sea monsters.
1. kraken (tentacles rising from the water, a ring of foam)  2. sea-serpent (three humps and a head)  3. whale (breaching)  4. shark-fin  5. giant-crab  6. sea-dragon (a horned head and neck rising from the waves)
```

```text
Sheet F4-3: sea features.
1. whirlpool  2. iceberg  3. coral-reef (seen through shallow water)  4. sea-stacks (three rock pillars with foam)  5. islet-palm (a tiny island with two palms)  6. shipwreck (a broken hull on a reef)
```

```text
Sheet F4-4: map ornaments, painted, no writing.
1. compass-rose-large ★  2. compass-small (four-point)  3. cartouche-scroll (a blank unrolled scroll with curled ends)  4. ribbon-banner (a blank ribbon, wavy)  5. wind-head (a cloud face blowing wind)  6. corner-flourish (an ornamental corner piece with vines)
```

### F5 Scatter (18, three sheets)

Small things for filling gaps. They are shown at about 10–20 px, so keep each to one clear shape.

```text
Sheet F5-1: nature.
1. bush-green  2. bush-flowers  3. fern  4. grass-tuft  5. reeds  6. boulder-small
```

```text
Sheet F5-2: farm, top-down.
1. field-wheat (a rectangular patch)  2. field-green-rows  3. field-ploughed  4. haystack  5. fence-section (a wooden fence, 3 times as long as wide)  6. scarecrow
```

```text
Sheet F5-3: road side, three-quarter view.
1. signpost (no text)  2. milestone  3. wagon  4. campfire  5. tent-small  6. dock-pier (a short wooden pier with a post)
```

## Ink packs

Use the Ink block. Sizes and layouts are the same as the Fantasy sheets, so reuse those prompts where the list says "same as". Anything that needs a colour in Fantasy is drawn in line and hatching here.

### I1 Terrain (36, six sheets)

```text
Sheet I1-1: mountains. 4 is wide.
1. peak-single  2. peak-pair  3. range-wide (five peaks)  4. peak-snow (leave the snow cap white, hatch the flanks)  5. volcano (smoke in curls)  6. spire
```

```text
Sheet I1-2: hills and dunes. 2 and 5 are wide.
1. hill-single  2. hills-row (three)  3. hills-rocky  4. dunes-small  5. dunes-wide (wind ripples hatched)  6. barrow (a mound with a stone door)
```

```text
Sheet I1-3: single trees.
1. broadleaf  2. pine  3. palm  4. dead  5. willow  6. birch
```

```text
Sheet I1-4: clumps.
1. broadleaf-small (3 trees)  2. broadleaf-dense (15 trees)  3. pine-small  4. pine-dense  5. mixed  6. jungle
```

```text
Sheet I1-5: wet and cold ground.
1. swamp-reeds (tufts of reeds and standing water ticks)  2. dead-forest  3. marsh-tuft  4. ice-floe  5. glacier  6. firs-snow
```

```text
Sheet I1-6: dry ground and rock.
1. cactus-pair  2. oasis (three palms and a pool)  3. cliff (a rock face with hatching)  4. canyon-bend (steep walls, seen from above, a dry riverbed)  5. rock-pile  6. boulder
```

### I2 Sites (36, six sheets)

Use the same six sheets as F3-1 to F3-6, drawn in Ink style, with these file names (items are the same order):

```text
F3-1 → hamlet, village, farmstead, town, walled-town, windmill
F3-2 → city, walled-city, port-town, port-city, crossroads-inn, market-town
F3-3 → castle-small, castle-large, fortress-cliff, keep-tower, watchtower, wizard-tower
F3-4 → temple, monastery, cathedral, lighthouse, palisade-fort, citadel
F3-5 → ruins-town, ruins-tower, cave-entrance, dungeon-gate, mine-entrance, standing-stones
F3-6 → shrine, graveyard, dragon-lair, bandit-camp, battlefield, obelisk
```

Prompt to send after the Ink setup: `Sheet I2-1: draw the six items of Sheet F3-1 below in this ink style, ...` followed by the F3-1 list pasted in. Drop colour words (terracotta, red banners, glow) and describe them as hatching instead.

### I3 Sea and dressing (24)

Same four sheets as F4-1 to F4-4, ink style. Ships in profile, all facing right. Dressing is blank, no writing. Ornaments carry the most detail here, because they are drawn larger.

### I4 Ink city plan (30, five sheets)

Same lists as F6-1 to F6-5. Top-down. Roofs drawn with ridge lines, tile hatching and one chimney, filled with cream wash.

## Realistic packs

Use the Realistic block.

### R3 Dungeon and interior (48)

The eight sheets of F7 with the same item lists and the same footprints. Replace the three-quarter and painted words with realistic wording, for example "weathered oak planks, iron bands, rust, chipped stone". Pieces that lie on a floor carry no floor of their own.

### R2 Buildings top-down (30)

The five sheets of F6, realistic. Add to each roof: moss in the north, a few missing tiles, weathering stains, chimneys with soot, lichen on stone. Keep the roof edge sharp.

### R1 Wilderness top-down (36, six sheets)

```text
Sheet R1-1: canopies, seen from above. Same scale; canopies are wide.
1. beech  2. maple-green  3. maple-red  4. cypress  5. cedar  6. spruce-snowy
```

```text
Sheet R1-2: canopies, more.
1. olive  2. willow  3. baobab  4. banyan  5. umbrella-pine  6. palm-fronds
```

```text
Sheet R1-3: undergrowth.
1. bush-berries  2. bush-flowering  3. fern-cluster  4. nettles  5. thorn-bramble  6. tall-grass-clump
```

```text
Sheet R1-4: ground cover and water.
1. lily-pads  2. reeds-pond  3. fallen-leaves  4. flower-patch-yellow  5. flower-patch-blue  6. mushroom-ring
```

```text
Sheet R1-5: rocks.
1. outcrop-grey  2. outcrop-red  3. boulder-mossy  4. scree  5. slate-slabs  6. sinkhole
```

```text
Sheet R1-6: dead wood and animals.
1. stump  2. fallen-trunk  3. hollow-log  4. beaver-dam (top-down, wide)  5. anthill  6. animal-bones
```

### R4 World aerial (18, three sheets)

Slightly oblique aerial view (like a satellite photo tilted a little), soft top-left light, no outline.

```text
Sheet R4-1: terrain.
1. mountains-green  2. mountains-snow  3. mountains-desert  4. volcano  5. forest-mass-temperate (a dense dark canopy patch with a soft edge)  6. forest-mass-conifer
```

```text
Sheet R4-2: terrain, more.
1. dunes  2. glacier  3. badlands  4. swamp  5. plateau-cliffs  6. salt-flat-lake
```

```text
Sheet R4-3: settlements from above.
1. village  2. town  3. city-walled ★  4. castle  5. port  6. farmland-patch
```

## Atlas packs

Use the Atlas block.

### A1 World symbols (36, six sheets)

```text
Sheet A1-1: mountains and hills. 3 and 5 are wide.
1. peak  2. peak-pair  3. range  4. peak-snow  5. hills-row  6. volcano
```

```text
Sheet A1-2: trees and forests.
1. broadleaf  2. pine  3. palm  4. clump-small  5. clump-dense-green  6. clump-dense-pine
```

```text
Sheet A1-3: settlements, by size.
1. hamlet  2. village  3. town  4. city  5. walled-city  6. port
```

```text
Sheet A1-4: strongholds.
1. castle-small  2. castle-large  3. fortress  4. tower  5. church  6. temple
```

```text
Sheet A1-5: sites.
1. ruins  2. cave  3. mine  4. camp  5. shrine  6. lighthouse
```

```text
Sheet A1-6: landmarks.
1. windmill  2. bridge  3. standing-stones  4. graveyard  5. obelisk  6. farm
```

### A2 Sea and ornaments (18, three sheets)

```text
Sheet A2-1: ships in profile, all facing right.
1. galleon  2. cog  3. longship  4. steam-packet (a Victorian paddle steamer)  5. warship  6. fishing-boat
```

```text
Sheet A2-2: creatures and features.
1. kraken  2. sea-serpent  3. whale  4. whirlpool  5. iceberg  6. reef
```

```text
Sheet A2-3: ornaments, no writing.
1. compass-rose-large ★  2. compass-small  3. cartouche-blank  4. ribbon-blank  5. scale-bar-frame (an empty ruled bar with tick marks, no numbers)  6. corner-flourish
```

## Textures

Make them one per image, not sheets. These are the rules for every texture:

```text
TEXTURE RULES, applied to every image in this chat:
- One square image, 1024x1024, filling the whole frame. No border, no frame, no text, no vignette, no perspective, no objects.
- Top-down flat material, evenly lit from straight above, no shadows, no light gradient across the image.
- Seamless: the left edge continues into the right edge and the top edge into the bottom edge.
- Large, bold features (stones, patches, strokes of at least 40 px), low contrast, no single standout feature, no focal point, nothing that repeats noticeably. The image will be shrunk to 128 px, so fine detail is wasted.
- Mid-tone overall: not very dark, not very light.
Reply only "ready". Then I will send the material list one line at a time; make each as its own image.
```

Add the style block you want after the texture rules (Fantasy, Ink, Realistic or Atlas).

### T1 Fantasy ground, painted (24)

Paste the Fantasy block, then the texture rules, then these one at a time ("Material: ..."). Style line to add: `Hand-painted, soft brush strokes, gentle cel shading, no outlines.`

```text
grass-lush, grass-dry, meadow-flowers (grass with small yellow and white flowers), dirt-brown, dirt-red, mud-dark, sand-pale, dunes-gold (rippled), snow-fresh, snow-trampled, ice-blue (cracked), rock-grey, rock-red, cracked-earth (drought), swamp-murk (green water with weed), farmland-furrows, forest-floor (leaf litter), ash-black, lava-crust (black plates with orange cracks), water-shallow (clear teal with ripples), water-deep (dark blue with soft wave lines), cobble-grey, flagstone-warm, planks-oak
```

### T2 Ink patterns (12)

Paste the Ink block, then the texture rules. The ground is plain warm parchment (#EADFC4), fully opaque, and the pattern is drawn in sepia ink. Item names are the file names.

```text
stipple-sand (fine dots), hatch-hills (short parallel strokes in curved rows), cross-hatch-rock, wave-lines (sea, wavy horizontal ink lines), grass-ticks (tiny v-shaped tufts), marsh-ticks (reed tufts with small water dashes), forest-dots (clusters of tiny tree marks), field-lines (parallel furrows), snow-ticks (sparse sparkle marks), cobble-ink (irregular stone outlines), paper-plain (warm parchment grain only), paper-stained (parchment with faint foxing)
```

### T3 Dungeon floors, realistic (12)

Paste the Realistic block, then the texture rules.

```text
flagstone-worn, flagstone-dark, marble-cracked, cave-floor (rough grey-brown rock), brick-damp, sewer-stone (wet green-stained), bone-dust, checker-aged (black and white tiles, chipped), planks-rotten, straw-dirt, obsidian-ash, carpet-red-worn
```

### T4 Atlas washes (12)

Paste the Atlas block, then the texture rules. Each is a flat, calm hand-coloured wash with faint paper grain and very light texture strokes.

```text
wash-grass, wash-forest, wash-sand, wash-rock, wash-snow, wash-mud, wash-sea (teal with faint wave hatch), wash-shallow, wash-swamp, wash-farmland, wash-cobble, wash-parchment
```

### T5 Covers (4)

A cover is one 3:2 picture over the whole map, not a tile. Use 2048×1365 or larger, no seams needed, soft large-scale variation (patches, rivers of colour, paths), no objects, no text, no focal point. Use the Fantasy block.

```text
cover-meadow (patchwork of grass and flower fields), cover-desert (dunes, rock plates, dry riverbeds), cover-tundra (snow, bare rock, frozen ponds), cover-wasteland (ash, cracked earth, lava seams)
```

## Making the textures seamless

Image models rarely return true seamless tiles. The map already blends tiles by default, so a faint seam is acceptable, but one pass makes it clean. Give ChatGPT this with the images attached:

```text
For each attached image: make it seamless. Offset it by half its width and height (wrap around), blend the visible cross-shaped seam with a soft feathered mask from the original, and save as PNG with the same file name at 1024x1024. Show me the offset version of each so I can check the seam is gone. Put all results in one ZIP.
```

## Cutting out the stamps

Run this once per batch with the sheets attached and the file-name lists from each answer:

```text
These images are sheets of 3 columns x 2 rows of objects on a flat magenta (#FF00FF) background. For each sheet:
1. Split it into its six cells (equal thirds across, halves down).
2. In each cell remove the magenta and make it transparent. Remove magenta contamination from edge pixels too (colour de-spill), so no pink fringe is left on light or dark edges. Keep the interior of objects untouched.
3. Crop to the object's bounding box plus 4 px of transparent padding. Do not resize or recolour.
4. Save as PNG named exactly as in my list for that sheet (lowercase, hyphens, no spaces).
5. Check each result and tell me about any that touch the cell edge (cropped), still show pink, or were merged with a neighbour.
Put all PNGs in one ZIP named <pack-name>.zip with no sub-folders.
```

For the best quality on ★ items, ask for one object per image and use the same prompt; it also works on a single image.

## If a sheet goes wrong

| Problem                                   | Fix                                                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| Text, numbers or labels appear            | Add "There is no text of any kind, not even on signs or banners" and regenerate                           |
| Objects touch or merge                    | Ask for "wider margins, at least 12%" or generate 4 per sheet (2×2)                                       |
| Pink or magenta inside the objects        | Change the background to pure cyan #00FFFF for that sheet only (keep the cut-out prompt, swap the colour) |
| Scale is inconsistent                     | Add "Every object has the same height of about 70% of its cell"                                           |
| Style drifts after many sheets            | Open a new chat, paste the shared rules and style again, attach two approved sheets                       |
| Objects look dark and muddy at small size | Add "Raise the contrast and the saturation; flatten the shading to two tones"                             |
| Objects have a cast shadow on the magenta | Add "No shadow of any kind on the background, the object floats"                                          |

## Licence note

Pictures made with an image tool follow that tool's terms. Record them in `THIRD_PARTY_NOTICES.md` like AI_GEN, as owner-generated, when they are bundled. Do not prompt with a living artist's or a product's name.
