# Atlasforge

A browser map studio with a tavern-inspired walnut, brass, and parchment interface. Built from the attached D&D Map Maker product plan. All artwork is procedural or openly licensed; no AI-generated images are used.

## Host it for other people

On a fresh Debian/Ubuntu VPS with ports 80 and 443 open:

```sh
git clone https://github.com/likikikpa/atlasforge.git
cd atlasforge
sh deploy/install.sh maps.example.com   # omit the domain to serve plain HTTP on the IP
```

This installs Docker if needed, builds the app and starts it behind Caddy with an automatic HTTPS certificate. Nothing to configure, no accounts and no database: each visitor's maps are saved in their own browser. See [docs/HOSTING.md](docs/HOSTING.md) for DNS, updates, settings, image-search privacy and running without Docker.

## Start on Windows

Install Node.js 24 LTS with npm, then double-click `start.bat` in the `atlasforge` folder. It runs the PowerShell launcher below without changing your execution policy and accepts the same options (for example `start.bat -Port 5174`). Or open PowerShell in the folder and run:

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

`PORT` overrides the production server port. `HOST` overrides the bind address; the default is `127.0.0.1`. `TRUST_PROXY=1` tells the server a reverse proxy sits in front of it (per-visitor rate limits then use the real address), and `ATLASFORGE_SEARCH=off` disables the image-search proxy; `ATLASFORGE_CONTACT` is an email or URL sent to Wikimedia with searches. Generation, editing, saves, the built-in sprite library, and exports run entirely in the browser. An installed production build works offline after its first successful load; image search needs the local server and a network connection. Development mode does not install an offline service worker.

## Linux setup

Install Node.js 24 LTS with npm using your preferred Node installer/version manager. If using nvm, run `nvm install` and `nvm use` in this directory. Then:

```sh
cd /path/to/atlasforge
npm ci
npm run build
npm start
```

Open http://127.0.0.1:5173 in a browser with WebGL support. The Linux browser version needs no Wine, Python, or Windows-specific runtime dependency.

Alternatively, `sh start.sh` installs dependencies if missing, builds the app, starts it on http://127.0.0.1:5173 (or `PORT`), and opens your browser; press **Ctrl+C** to stop it. `sh scripts/start.sh` does the same without opening a browser: it installs dependencies if missing, builds the app, and starts it. This launcher works from other directories and paths containing spaces. Invoking it with `sh` avoids needing an executable permission bit when unpacking a ZIP.

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

Open http://127.0.0.1:5173. The container binds internally to `0.0.0.0`; the command publishes it only on your computer's loopback address. `/healthz` reports readiness. No volume is needed for map saves because maps remain in IndexedDB in your browser. The runtime image contains only the small Express server (the editor is bundled during the build), so it stays tiny.

For a public server use `docker compose up -d --build` instead, which adds Caddy and automatic HTTPS (see above).

The source works on Linux x64 and ARM64; native dependency selection is handled by npm. The Dockerfile uses the architecture selected by Docker. The included Ubuntu CI workflow checks Node 22 and 24, filename casing, shell syntax, tests, builds, production startup from another directory, and the Docker image. Linux/Docker CI results are available after this source is pushed to a GitHub repository with Actions enabled.

## Implemented

- Seeded world, city, and dungeon generation in a Web Worker, with editable settings and targeted rerolls for water, settlements, city buildings, and dungeon contents.
- New maps start empty, including the first map on a fresh launch. Choose settings and press **Generate map** to populate them. Each press rolls a new seed; tick **Lock seed** to regenerate the same map.
- World height fields with seed-dependent continents, climate-driven biomes, rain shadows, hill shading, inland lakes and river systems. Rivers follow priority-flood drainage, begin where enough water gathers, gain tributaries where large streams meet, widen towards the sea and are smoothed into flowing curves. Settlement pins, kingdom boundaries and three map styles complete the world.
- Terrain tools in the style of Inkarnate: the **mountain** tool raises land and the **shovel** digs it away with a soft round brush that works continuously while you hold the pointer, so ground rises out of the sea and sinks back into it. Smooth, flatten, roughen and biome brushes, freehand mountain ranges, islands with ragged coasts and one-click rivers complete the set. Only the changed part of the map is repainted, so sculpting stays responsive. Biomes and colours follow terrain edits. The terrain brush shares the Layers panel's texture library: pick a ground, swap its image or add a new texture layer without leaving the tool. Built-in grounds can be retextured but never deleted, and the editor warns once a project passes 24 texture layers. Terrain paint stamps terrain rather than colouring it: the moment you touch, everything under the brush becomes the chosen ground and the layers below appear around it, so snow on open sea makes a snow peak ringed by rock, grass, dirt and sand, painting sand on the sea makes a beach, and the water grounds dig basins. The dig tool cuts back down through the same layers, and your own textures are painted on grass-height ground and peel off when dug. The brush ring stays on screen after a finger lifts and while the size slider moves.
- Every tool shows its name, a short description and its shortcut the moment you point at it, and the *More tools* panel lists what each one does.
- All map types share the same toolbar and full **More tools** list. Terrain and rivers work in worlds, cities, and dungeons; dungeon landscapes are separate from room floors so sculpting preserves room geometry.
- Cities that differ with every seed: a river, coast or hill site, gate roads, ring roads and side streets (or a street grid), an irregular wall broken by water, a keep, districts, and buildings that line the streets, with generated business names, owners and GM notes. Rerolling buildings keeps the streets. World settlement pins open linked cities that inherit the surrounding terrain, climate and river positions.
- Connected BSP dungeons with several corridor layouts, irregular rooms, doors, GM markers, stairs, editable room keys, SRD monsters, and level-filtered magic items. The room tool merges touching floor regions and redraws walls. Room deletion updates numbering.
- PixiJS WebGL map display, cursor-centred wheel zoom, Space/middle-button panning, fit, square/hex grids, contours, and snapping.
- Brush, pencil, eraser, contiguous raster fill, line, rectangle, ellipse, text, eyedropper, and stamp/scatter tools. Painting is isolated from terrain. Tablet pressure adjusts terrain strength.
- Object multiselection and marquee, dragging, eight resize handles, rotation, numeric transforms, flips, groups, alignment, distribution, duplication, stacking, and deletion. Shift constrains scale/rotation; Alt scales from the centre or samples colour.
- Fixed and user layers, visibility, locking, opacity, blend modes, and paintable layer masks. Mask painting hides; the eraser restores. Player mode hides the GM-only layer.
- Undo/redo and project history for the current session; persistent named project snapshots; IndexedDB autosave; portable JSON project files that embed imported raster assets.
- All 209 sprites from Kenney's hand-inked Cartography and Medieval RTS packs, bundled for offline use. Pick one in the Library, then click or drag on the map to place it (trees scatter as you drag). Generated world maps draw their mountains, forests, deserts and settlements with the same sprites; placed sprites are stored by path, so project files stay small.
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
