# Third party notices

## Dungeons & Dragons SRD 5.2

This work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.

Creature and magic item data were imported from https://api.open5e.com/v2/creatures/ and https://api.open5e.com/v2/magicitems/, strictly filtered to document key `srd-2024`. The data have been selected and reformatted for offline use, stat-block display, and procedural dungeon generation. Room text and trap descriptions are original Atlasforge content. The raw, unmodified source records are available from Open5e, https://open5e.com.

## Kenney

The Kenney Cartography Pack (83 symbol sprites) and Kenney Medieval RTS (126 sprites) are provided under CC0 1.0 Universal by Kenney.

- https://kenney.nl/assets/cartography-pack
- https://kenney.nl/assets/medieval-rts
- https://creativecommons.org/publicdomain/zero/1.0/

Original package licences are included in `public/assets/cartography/License.txt` and `public/assets/medieval/License.txt`. Pack downloads and source URLs are recorded in `scripts/import-kenney.mjs`. Sprite names and pack metadata appear in `src/data/kenney.json`.

## Runtime imports

Images imported from external libraries remain subject to their own licences. Atlasforge retains the asset's author, licence, and source URL in the project and credits export. Private/local assets remain the user's responsibility to license. Non-commercial licences are flagged when a project is marked commercial.

## Noto Sans

PDF room keys embed Noto Sans Regular under the SIL Open Font License 1.1. The font and its original licence are bundled in `public/fonts/`. Source: https://github.com/notofonts/noto-fonts/tree/main/hinted/ttf/NotoSans.

## Software

React, PixiJS, Lucide, jsPDF, fflate, idb-keyval, Express, Vite, Workbox, and development dependencies are distributed under their respective package licences. Consult `package-lock.json` and the installed packages for exact versions and licence files.
