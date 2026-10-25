# Third party notices

## Dungeons & Dragons SRD 5.2

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Creature and magic item data were imported from https://api.open5e.com/v2/creatures/ and https://api.open5e.com/v2/magicitems/, strictly filtered to document key `srd-2024`. The data have been selected and reformatted for offline use, stat-block display, and procedural dungeon generation. Room text and trap descriptions are original YDMing content. The raw, unmodified source records are available from Open5e, https://open5e.com.

## Kenney

The Kenney Cartography Pack (83 symbol sprites) and Kenney Medieval RTS (126 sprites) are provided under CC0 1.0 Universal by Kenney.

- https://kenney.nl/assets/cartography-pack
- https://kenney.nl/assets/medieval-rts
- https://creativecommons.org/publicdomain/zero/1.0/

Original package licences are included in `public/assets/cartography/License.txt` and `public/assets/medieval/License.txt`. Pack downloads and source URLs are recorded in `scripts/import-kenney.mjs`. Sprite names and pack metadata appear in `src/data/kenney.json`.

## Mark Gosbell, dungeon dressing

The 50 pictures in the Library's "Dungeon dressing" collection (beds, tables, chests, barrels, bookcases and more) come from "70+ Free Flat Greyscale Dungeon Assets" by Mark Gosbell, released under CC0 1.0 Universal. Credit is optional; the author's note is in `public/assets/gosbell/License.txt`.

- https://markgosbell.itch.io/70-free-flat-greyscale-dungeon-assets
- https://creativecommons.org/publicdomain/zero/1.0/

The effects, number and 5x5 tile files of the pack are not included. Download and file list: `scripts/import-gosbell.mjs`; sprite data: `src/data/gosbell.json`.

## Mark Gosbell, classic dungeon symbols

The 86 pictures in the Library's "Classic dungeon symbols" collection come from "Classic Dungeon Map Symbols" (high resolution set) by Mark Gosbell, released under CC0 1.0 Universal. Credit is optional.

- https://markgosbell.itch.io/classic-dungeon-map-symbols
- https://creativecommons.org/publicdomain/zero/1.0/

Download and file list: `scripts/import-classic-dungeon.mjs`; sprite data: `src/data/classic-dungeon.json`.

## Amanz (Deface Games), map icons

The 41 pictures in the Library's "Map icons" collection are icons from "Fantasy Map Assets Pack Lite" by Amanz (Deface Games), trimmed to their drawing. The itch.io page licenses the pack under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/); the pack's readme says credit is not required. YDMing credits it anyway: placing one of these stamps adds the pack to the world's credits and to `CREDITS.txt` in exports.

- https://amanz.itch.io/fantasy-map-assets-pack-lite

The backgrounds, overlays and islands of the pack are not included. Download and conversion: `scripts/import-amanz.py`; sprite data: `src/data/amanz-lite.json`.

## AI_GEN, generated stamps

The 68 pictures in the Library's "AI_GEN" collection were generated with an AI image model by the project owner and trimmed to their drawing. They are not copied from a third-party pack and no third-party licence applies; their use follows the terms of the tool that generated them. They are the only AI-generated pictures in YDMing. `scripts/import-ai-gen.py` builds them from the ZIPs in `data/`.

## Poly Haven, photo textures

The 23 ground tiles offered by the Terrain paint tool, which the Realistic style paints its biomes with, are shrunk to 128 px from textures on Poly Haven, released under CC0 1.0 Universal. Each one's page and author are listed in `public/assets/textures/License.txt` and `src/data/textures.json`.

- https://polyhaven.com/license

Download and conversion: `scripts/import-polyhaven.py`.

## Sprite search index

`data/sprite-index.json` lists the names and paths of the icons in the game-icons.net collection (https://game-icons.net, https://github.com/game-icons/icons) so the image search can find them. The icons are licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/) by their authors (Lorc, Delapouite and others, credited per icon); they are not bundled but loaded on demand from cdn.jsdelivr.net. When one is imported, YDMing records its author, licence and source page in the project credits. OpenGameArt search results are limited to CC0 2D art.

## Runtime imports

Images imported from external libraries remain subject to their own licences. YDMing retains the asset's author, licence, and source URL in the project and credits export. Private/local assets remain the user's responsibility to license. Non-commercial licences are flagged when a project is marked commercial.

## Noto Sans

PDF room keys embed Noto Sans Regular under the SIL Open Font License 1.1. The font and its original licence are bundled in `public/fonts/`. Source: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans.

## Map lettering fonts

Names on the map are lettered in Alegreya, Cinzel, IM Fell English, Pirata One, Uncial Antiqua and Marck Script, each under the SIL Open Font License 1.1. The fonts, their copyright lines and the licence text are bundled in `public/fonts/map/` (`FONTS.txt`). Alegreya, Cinzel and IM Fell English are cut down to Latin and Cyrillic and converted to WOFF2; the three with Reserved Font Names are shipped unmodified. Source: https://github.com/google/fonts/tree/main/ofl.

## Software

React, PixiJS, Lucide, jsPDF, fflate, idb-keyval, Express, Vite, Workbox, and development dependencies are distributed under their respective package licences. Consult `package-lock.json` and the installed packages for exact versions and licence files.
