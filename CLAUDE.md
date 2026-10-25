# YDMing

Browser map studio for dungeon masters (React + TypeScript + Vite, PixiJS for the map view). A world (`Project`) holds a tree of maps; worlds are saved in the browser; `server.mjs` serves the build and the image-search proxy (`/api/search`, `/api/image`).

## Commands

- `npm run dev`: dev server with the search API, http://127.0.0.1:5173
- `npx tsc -b`: typecheck
- `npx vitest run`: unit tests (`npm test` also runs the server tests)
- `npm run build`, then `npm start`: production build and server

CI (`.github/workflows/linux.yml`) runs typecheck, tests, build, a server smoke check and a Docker build on Node 22 and 24. Do not call work done, or merge, until it is green.

## Where things live

- `src/App.tsx`: only composes the screen. State lives in `src/app/`, drawing in the folders below.
- `src/app/`: `useAppModel` builds the app state from small hooks, each with one job (`useProjectStore` for the project and undo, `useToolState`, `useTextureLayers`, `useGenerator`, `useObjectActions`, `useLibrary`, `useProjectFiles`, `useKeyboardShortcuts`, ...). A hook gets only the earlier hooks it needs, so the order in `useAppModel` matters. `constants.ts` holds tool tables and shared types.
- `src/layout/` (top bar, tool rail, canvas, tool card, sidebar, status bar), `src/panels/` (Generator, Layers, Library, History, More tools, Rooms), `src/modals/`, `src/ui/` (shared buttons, tooltip, fields): components take `app: ReadyApp` and destructure what they use.
- `src/editor/`: the map canvas. `useEditorCore` holds every ref; `overlay`, `rendering`, `sculpting`, `stamps`, `pinch` and the `pointer-*` files each build on the earlier ones, composed in `Editor.tsx`.
- Pure logic with tests lives in the root of `src/`: `sculpt.ts`, `materials.ts`, `erase.ts`, `search.ts`, `storage.ts`, `generator.ts`, `worlds.ts` (saved worlds), `map-tree.ts` (map parents and stamp links), `note-link.ts` (Obsidian links), `clipboard.ts` (copy and paste), `path-select.ts` (picking rivers, roads and walls), `stamp-brush.ts` (the stamp tool's sprite), `extent.ts` and `id-set.ts` (min/max and id lookups that stay fast and safe for any number of stamps), `shortcut-key.ts` (the letter of a key press on any layout), `images.ts` (the per-world image table, and moving old embedded images into it), `fog.ts` (fog of war grids, run-length storage, brushes), `biomes.ts` (biome ids and names, which are stored in saved maps: add at the end, never renumber), `biome-grounds.ts` and `biome-decor.ts` (what each biome's ground and pictures are), `style-ground.ts` (a style's photo grounds), `terrain-material.ts` (a texture layer or biome turned into the tiles the terrain painter samples). Fog is drawn by `fog-render.ts` and edited by `editor/fog-tool.ts`. `scatter.ts`, `scatter-kinds.ts`, `scatter-habitat.ts`, `scatter-mixes.ts` and `scatter-brush.ts` (the Stamp tool's scatter brush: placement, kinds of picture, what grows on which biome, saved mixes, settings; the editor side is `editor/scatter-tool.ts`), `tint.ts` (a stamp's tint), `names.ts` and `names-data.ts` (place names by culture and ground) with `settlement-site.ts` (what a settlement's ground, shore and river are like), `biome-placement.ts` (where the generator paints the special biomes), `scenes.ts` (built-in and saved scenes), `pack-import.ts` (stamp packs from files or a ZIP) and `backup.ts` (when to remind about a file copy) are pure and tested. Rendering is `render.ts` and `terrain-render.ts`.
- Server: `server-app.mjs` (Express app), `server-api.mjs` (the search proxy), `server-sources.mjs` (Wikimedia, Openverse, OpenGameArt), `server-sprites.mjs` (the sprite index and the sprite-or-picture rules), `server-auto.mjs` (the Auto search that combines them). `data/sprite-index.json` is built by `npm run index:sprites`; the Dockerfile copies every server file and `data/`, so add new ones there.

## Keep files small

- Put new code in a new file named for its job. Do not grow a file past about 250 lines; split it first.
- Do not put state, handlers or markup back into `App.tsx` or `editor/Editor.tsx`. Add a hook in `src/app/` or a component in `layout/`, `panels/` or `modals/`.
- `terrain-render.ts` (about 1,300 lines) and `render.ts` (about 750) are still too large. When you change them, move the part you touch into its own module instead of adding to them.
- When you split or move code, change nothing else in the same commit, and prove it is unchanged: typecheck, tests, and the same UI states photographed before and after (see Checking changes).

## Bugs

When you find a bug, or one is reported:

1. Recheck how it happens before changing code. Reproduce it (a test, the browser, or a measurement), then trace the exact path: which input, which code, why that code does the wrong thing.
2. Fix that cause, not the symptom it shows.
3. Add a test that fails without the fix where the code allows it, and rerun the original scenario to confirm it is gone.
4. Look for the same mistake elsewhere and fix those too.

## Performance

Phones are the main target and several fixes here made things slower before they made them faster. So:

- Measure before you change anything, and again after. Use headless Chromium: long tasks (`PerformanceObserver` with `longtask`) for freezes, a CPU profile (CDP `Profiler`) for what the time goes to. Reading the code is not enough; the cause of lag was wrong in the first guess more than once.
- Measure the neighbours too. Making terrain tools cheaper (GPU tiles) made brush strokes slower until they reported their changed area as well. Check zoom, pinch, a terrain stroke and a paint stroke, not only the thing you fixed.
- Brush, pencil, shape, eraser and terrain frames must redraw and upload only the area they change (`clip` in `drawMap`, GPU tiles in `editor/rendering.ts`). A new tool reports its changed area; a frame with no area redraws the whole map.
- Do not store fast-changing values (the pointer position, zoom) in React state read by the whole app. Use the store in `src/status.ts`.
- A map can hold tens of thousands of stamps (copy and paste doubles them). Never spread a list of objects or ids into a call (`Math.min(...xs)`, `push(...list)`): it throws a RangeError from about 120,000 items. Use `extent` or `objectBounds` (`src/extent.ts`) or a loop. Never test every object against an id array (`ids.includes(o.id)`): use `idSet` (`src/id-set.ts`), or a `Map` built once. Both made copy and paste freeze or fail on large maps.
- Keyboard shortcuts compare `shortcutKey(e)`, never `e.key === "c"`: on a Russian layout Ctrl+C reports "с" and the shortcut silently does nothing.
- A touch must not change the map until it is clear it is not the first finger of a pinch (see `holdUntil` in `editor/sculpting.ts`).

## Checking changes

Tests cover logic only. Rendering, touch and layout have none, so look at the real app:

- Run it (`npm run dev`) and drive it with Playwright and the Chromium that is installed, in a desktop size and a phone size (touch, 412×860). Screenshot the states you changed, check the console for errors, and read the screenshots.
- For a refactor, take the same set of screenshots before and after and compare them pixel by pixel; only the noise of time-based tools (dig, tooltips) may differ.
- Test the phone layout and pinch for any change to the canvas, sidebar or tool bar.

## Saves and data

Projects are stored in users' browsers and in `.ydming` files (older `.atlasforge` files and `atlasforge-*` browser keys still load, see `src/legacy-keys.ts`), so old saves must keep loading.

- New fields on `Project`, `MapData` or `TextureLayer` are optional, and `validateProject` in `src/storage.ts` checks them.
- Never change what an existing field means. Add a new field instead.
- Imported pictures live once per world in `Project.images`; a stamp holds only `imageId` (see `src/images.ts`). Never put a data URL in a `MapObject`: every edit, undo step and save copies the whole map, so thousands of stamps with their own copy of a picture froze the app. Old saves that embed the picture in each stamp are moved into the table when loaded (`migrateImages`).

## UI text

- No filler: no taglines, slogans, descriptions of tools or explanatory footnotes. Short labels, error messages and hover tooltips are fine.
- Do not add text that describes a tool in the YDMing interface (captions, hints, help blocks) until the owner asks for it or it is clearly needed. Extra text hides the tools, most of all on a phone. Comments, docs and other descriptions outside the UI are still fine.
- English strings go through `t()`; add the Russian translation to `src/i18n.ts`.
- Error messages say what to do ("Image search needs the YDMing server"), never a raw exception. Image search only works with `server.mjs`; a static host answers `/api/search` with plain text, which `src/search.ts` turns into a clear message.

## Formatting

Prettier is not a project dependency and most older files are not formatted with it. Format only files you create (`npx prettier --write <file>`); never reformat an older file, because that hides your change in the diff. Files in `src/app/`, `src/layout/`, `src/panels/`, `src/modals/`, `src/ui/` and `src/editor/` are Prettier-formatted: keep them so.

## Git and pull requests

- One branch per task. A merged pull request is finished and cannot take new commits: before pushing, check whether the PR is still open. If it merged, restart the branch from `main`, move your commits onto it and open a new PR.
- Push only to the branch you were given. Do not rewrite history on a branch someone else uses.
- Commit messages say what changed and why, in plain words.
- Do not merge or open a pull request unless asked.

## Previews

The app expects to be served from the root of a domain with a service worker. To publish a preview on a page or sub-path, build with `base: "./"`, leave out the service worker, and change the absolute `/assets/` and `/fonts/` paths in the bundle. Image search will not work there. Do not commit these changes to the app itself.

## Secrets

There are none in the repo. Never commit keys, tokens or `.env` files.
