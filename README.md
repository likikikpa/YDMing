# Atlasforge

A browser map studio with a tavern-inspired walnut, brass, and parchment interface. Built from the attached D&D Map Maker product plan. All artwork is procedural or openly licensed; no AI-generated images are used.

## Start on Windows

Install Node.js 24 LTS with npm. Open PowerShell in the `atlasforge` folder and run:

```powershell
.\Start-Atlasforge.ps1
```

The launcher installs dependencies when missing, builds the app, starts a local server, and opens your default browser at http://127.0.0.1:5173. First-time dependency installation needs internet. Keep PowerShell open while using the app; press **Ctrl+C** to stop its server. If Atlasforge is already running on that port, the launcher opens the existing app.

Use `.\Start-Atlasforge.ps1 -SkipBuild` for a faster launch after a successful build, `-NoBrowser` to leave the browser closed, or `-Port 5174` if another application occupies port 5173. Browser saves are tied to the browser and port, so keep the same port for existing maps. The script works in Windows PowerShell 5.1 and PowerShell 7 and can be called by its full path from another directory. It uses `npm.cmd` and does not change your PowerShell execution policy.

Maps are saved in your browser. Use **Save project** and **Open project** to transfer them between browsers or computers. The executable and desktop packaging have been removed.

## Run

Runs on Linux, Windows, and macOS with Node.js 24 LTS and npm. Node.js 22.12+ in the 22.x series is also supported; `.nvmrc` selects Node 24.

```sh
npm install
npm run dev
```

Open the URL printed by Vite, normally http://127.0.0.1:5173. For a production build with offline support:

```sh
npm run build
npm start
```

`PORT` overrides the production server port. `HOST` overrides the bind address; the default is `127.0.0.1`. Generation, editing, saves, the built-in sprite library, and exports run entirely in the browser. An installed production build works offline after its first successful load; image search needs the local server and a network connection. Development mode does not install an offline service worker.

## Linux setup

Install Node.js 24 LTS with npm using your preferred Node installer/version manager. If using nvm, run `nvm install` and `nvm use` in this directory. Then:

```sh
cd /path/to/atlasforge
npm ci
npm run build
npm start
```

Open http://127.0.0.1:5173 in a browser with WebGL support. The Linux browser version needs no Wine, Python, or Windows-specific runtime dependency.

Alternatively, `sh scripts/start.sh` installs dependencies if missing, builds the app, and starts it. This launcher works from other directories and paths containing spaces. Invoking it with `sh` avoids needing an executable permission bit when unpacking a ZIP.

When moving the project from Windows, copy the source, `package-lock.json`, `public/`, and bundled data, but do not copy `node_modules/`. Run `npm ci` on Linux so npm installs the correct native build tools. No case-insensitive filesystem is required. `npm run check:paths` checks the exact casing of local imports and bundled assets even when run on Windows; shell scripts are stored with LF line endings.

To use a different local port:

```sh
PORT=8080 npm start
```

For a development server accessible from a Linux VM/container, use `npm run dev -- --host 0.0.0.0`. For production binding, use `HOST=0.0.0.0 PORT=5173 npm start`. Browser storage, service workers, and offline installation require localhost or HTTPS; use HTTPS through your reverse proxy when accessing a remote Linux host. Projects are stored in the browser, so transfer existing maps using **Save project** and **Open project** when moving to another computer or browser origin.

## Docker

The image builds and tests the app in Linux and runs the server as a non-root user:

```sh
docker build -t atlasforge .
docker run --rm --name atlasforge -p 127.0.0.1:5173:5173 atlasforge
```

Open http://127.0.0.1:5173. The container binds internally to `0.0.0.0`; the command publishes it only on your computer's loopback address. `/healthz` reports readiness. No volume is needed for map saves because maps remain in IndexedDB in your browser.

The source works on Linux x64 and ARM64; native dependency selection is handled by npm. The Dockerfile uses the architecture selected by Docker. The included Ubuntu CI workflow checks Node 22 and 24, filename casing, shell syntax, tests, builds, production startup from another directory, and the Docker image. Linux/Docker CI results are available after this source is pushed to a GitHub repository with Actions enabled.

## Implemented

- Seeded world, city, and dungeon generation in a Web Worker, with editable settings and targeted rerolls for water, settlements, city buildings, and dungeon contents.
- New maps start empty, including the first map on a fresh launch. Choose settings and press **Generate map** to populate them.
- World height fields, climate-driven biomes, rain shadows, hill shading, priority-flood river routing, lakes, settlement pins, kingdom boundaries, and three map styles.
- Raise, dig, smooth, flatten, roughen, biome override, mountain ridge, island, and river tools. Biomes and colours follow terrain edits.
- All map types share the same toolbar and full **More tools** list. Terrain and rivers work in worlds, cities, and dungeons; dungeon landscapes are separate from room floors so sculpting preserves room geometry.
- Cities with streets, lots, buildings, walls, districts, generated business names, owners, and GM notes. World settlement pins open linked cities that inherit the surrounding terrain and river positions.
- Connected BSP dungeons with several corridor layouts, irregular rooms, doors, GM markers, stairs, editable room keys, SRD monsters, and level-filtered magic items. The room tool merges touching floor regions and redraws walls. Room deletion updates numbering.
- PixiJS WebGL map display, cursor-centred wheel zoom, Space/middle-button panning, fit, square/hex grids, contours, and snapping.
- Brush, pencil, eraser, contiguous raster fill, line, rectangle, ellipse, text, eyedropper, and stamp/scatter tools. Painting is isolated from terrain. Tablet pressure adjusts terrain strength.
- Object multiselection and marquee, dragging, eight resize handles, rotation, numeric transforms, flips, groups, alignment, distribution, duplication, stacking, and deletion. Shift constrains scale/rotation; Alt scales from the centre or samples colour.
- Fixed and user layers, visibility, locking, opacity, blend modes, and paintable layer masks. Mask painting hides; the eraser restores. Player mode hides the GM-only layer.
- Undo/redo and project history for the current session; persistent named project snapshots; IndexedDB autosave; portable JSON project files that embed imported raster assets.
- Twenty original procedural symbols plus all 209 sprites from Kenney's Cartography and Medieval RTS packs, bundled for offline use.
- Wikimedia Commons and Openverse searches through a small local proxy. Search accepts only results with known reusable licences permitting modification, retains author/source/licence metadata, and caches search responses for 24 hours. Errors and rate limits are shown in the library.
- Local image imports and reusable stamps with edge-connected background removal, tolerance, trimming, parchment recolouring, posterization, ink outlines, and shadows. Imported stamps retain credits across projects.
- PNG at 1×–3×, PDF with dungeon room keys, and Universal VTT `.dd2vtt` export. Downloads are ZIP files containing the map and `CREDITS.txt`. Player PDF exports omit room keys and GM markers. Project files retain GM information for editing.
- English and Russian interface controls, keyboard shortcuts, save failure reporting, and project-file validation.

## Data and licences

The checked-in `src/data/srd.json` contains 331 creatures and 760 magic items, strictly filtered to Open5e's `srd-2024` document. Nothing is fetched at play time. `npm run import:srd` refreshes it; this is an explicit maintenance command rather than a network requirement during every build.

The generator uses a conservative per-party XP cap and a theme filter when choosing a single room monster. It is not a full multi-monster encounter difficulty calculator. Treasure tiers admit common/uncommon at levels 1–4, rare at 5–10, very rare at 11–16, and legendary at 17–20. Traps and room descriptions are original generator content; creature and item details come from the bundled SRD.

`node scripts/import-kenney.mjs` reimports the two official CC0 sprite packs. Their original licences are under `public/assets/`. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md) for full attribution. Third-party software remains under its package licences.

## Verification

```sh
npm test
npm run check:paths
npm run build
node scripts/smoke-server.mjs
npm audit
```

Tests cover seeded repeatability, terrain bounds, dungeon connectivity, valid SRD identifiers/stat blocks, encounter and loot limits, river continuity and downhill flow, biome overrides, isolated rerolls, and flood-fill boundaries.

## Remaining parts of the product plan

This is a usable first release, not the entire five-phase roadmap. The following are not implemented: pixel marquee/lasso/magic-wand selections, polygon painting, clone/smudge/blur tools, curved text, prefab scene stamps, inter-object snapping, district painting and automatic road-side house insertion, full city stage-by-stage regeneration, dedicated gate and entrance-count controls, fog of war/interiors, lighting, game-icons.net browsing, Pixabay integration, ZIP asset-pack imports, automatic query translation, and a Tauri desktop wrapper. City roads and lots use a compact procedural implementation rather than a complete Voronoi street simulation. The terrain is coloured on a CPU raster surface uploaded to Pixi, not a dedicated terrain shader. A sculpt stroke currently updates on pointer movement. PDF room keys embed Noto Sans for Cyrillic text. VTT output follows Universal VTT 0.3 and has not been imported into Foundry/Roll20 during this session.
