# Verification

Verified locally on October 18, 2026.

- New world, city, and dungeon maps start empty and populate only after **Generate map** is pressed. Checked the first-launch world and new city/dungeon flows in an isolated browser origin; the dungeon room key showed zero rooms before generation and five afterward. Production build and all 19 tests pass after the change.

- TypeScript check and production build pass.
- Sixteen automated tests pass across generation, navigation hit testing, project serialization/validation, raster fill, and background removal.
- `npm audit`: zero known vulnerabilities in the installed dependency tree.
- Production browser: world, dungeon, and linked-city maps render without console errors. A settlement opens its linked city even when regional labels overlap it.
- Kenney sprites load from the offline bundle, can be placed and transformed numerically, and register the correct author/licence/source in Credits.
- Layer-mask painting preserves underlying terrain. Undo restores the previous state.
- IndexedDB restores the active map after a reload. Named snapshots persist after reload. English and Russian controls switch correctly.
- PNG export contains a 2400 × 1700 image and a credits file.
- Dungeon PDF: all three pages rendered and visually inspected. Embedded Noto Sans preserves Cyrillic headings; map, room key, and credits are readable. Compressed sample: approximately 122 KB.
- Universal VTT export parsed successfully: 228 wall segments and five public doors in the sample, coordinates within the image bounds, credits included, no room-key data in the player export. Import into a third-party VTT was not tested.
- Offline test: stopped the production server, reloaded the page successfully, recovered the saved city, navigated to the saved dungeon, and exported its PDF with no server running.

Browser checks used an isolated production origin on port 5174 so the editable development project on port 5173 was preserved. The temporary production server was stopped after offline verification. Sample maps and exports used for QA are under the ignored `qa/` directory.

## Linux compatibility changes

- Added a POSIX shell launcher with LF line endings, Node version checks, and paths that support spaces and launching from outside the project directory.
- Added a multi-stage Linux Dockerfile with a non-root runtime and health check, plus Ubuntu CI for Node 22/24 and a container startup check.
- Added configurable `HOST`/`PORT`, build discovery relative to the server module, useful missing-build errors, graceful shutdown, and `/healthz`. Missing assets now return 404 rather than the HTML application shell.
- `npm test`: 19 tests pass (16 editor/data tests plus three production-server tests).
- `npm run check:paths`: 276 local imports and public asset paths pass exact-case checks; the launcher uses LF line endings.
- `sh -n scripts/start.sh`: passes using the bundled Git POSIX shell on Windows.
- `npm run build`: passes. The production startup smoke check passes from a different working directory, including JavaScript, sprite, font, manifest, and service-worker requests.
- This host has no installed Linux/WSL distribution or Docker runtime. Native Linux and Docker execution were not performed locally; the added Ubuntu workflow performs those checks when run in GitHub Actions.

## Windows PowerShell launcher

- Removed the generated Windows executable, unpacked runtime, Electron wrapper, and Electron packaging dependencies. `npm uninstall` reports zero known vulnerabilities.
- `Start-Atlasforge.ps1` was run in Windows PowerShell 5.1. The default build/start path and `-SkipBuild -NoBrowser -Port 5176` both served the production app successfully; `/healthz` returned `{"status":"ok"}`.
- A second launch on the same port reused the running Atlasforge server. Ctrl+C stopped the server owned by the launcher and released its port.
- The production build, all 19 tests, and all 276 import/asset casing checks pass after removing the desktop dependencies.
- Browser opening was disabled during launcher checks; dependencies were already installed. First-time `npm ci` follows the existing lockfile.

## Shared map tools

- World, city, and dungeon maps share the main toolbar and complete **More tools** list, including terrain, islands, biome overrides, rivers, roads, walls, and rooms.
- Dungeon landscape data is separate from walkable floor heights. Added regression coverage for preserving floors/room keys during terrain and river edits, editing city/world terrain, and saving/loading validated dungeon landscapes.
- Browser checks confirmed island drawing in a city and around a generated dungeon, river placement on dungeon terrain, undo, and landscape persistence after reload. The dungeon retained all five room keys. The final production build also restored the saved terrain and full tool list.
- Fixed terrain texture invalidation after island, ridge, and room drawing so edits appear immediately.
- Production build, all 22 automated tests (19 editor/data tests plus three production-server tests), and all 284 import/asset casing checks pass.
