# Atlasforge

Browser map studio (React + TypeScript + Vite, PixiJS for the map view). Maps are saved in the browser; `server.mjs` serves the build and the image-search proxy (`/api/search`, `/api/image`).

## Commands

- `npm run dev`: dev server with the search API, http://127.0.0.1:5173
- `npx tsc -b`: typecheck
- `npx vitest run`: unit tests (`npm test` also runs the server tests)
- `npm run build`, then `npm start`: production build and server

## Bugs

When you find a bug, or one is reported:

1. Recheck how it happens before changing code. Reproduce it (a test, the browser, or a measurement), then trace the exact path: which input, which code, why that code does the wrong thing.
2. Fix that cause, not the symptom it shows.
3. Add a test that fails without the fix where the code allows it, and rerun the original scenario to confirm it is gone.
4. Look for the same mistake elsewhere and fix those too.

For slowness, measure first (long tasks or a CPU profile in headless Chromium), and compare before and after the fix.

## Notes

- Keep the UI free of filler text: no taglines, slogans or descriptive footnotes. Short labels, error messages and hover tooltips are fine.
- English strings go through `t()`; add the Russian translation to `src/i18n.ts`.
- Editing performance matters on phones. Brush and terrain frames redraw and upload only the area they change (`clip` in `drawMap`, GPU tiles in `Editor.tsx`), so new tools should report their changed area too.
