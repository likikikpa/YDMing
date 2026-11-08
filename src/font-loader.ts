import {
  DEFAULT_STACK,
  fontFamily,
  fromDataUrl,
  isBundledFont,
  stackOf,
} from "./fonts";
import type { FontTable } from "./fonts";

let table: FontTable = {};
const ready = new Set<string>(),
  failed = new Set<string>(),
  loading = new Map<string, Promise<void>>(),
  listeners = new Set<() => void>();

/** Tells the loader which fonts the open world holds. Cheap: call it on every render. */
export function registerFonts(next: FontTable | undefined) {
  const fresh = next ?? {};
  if (fresh === table) return;
  table = fresh;
  // A font that was missing or broken may be there now.
  failed.clear();
}

/** Calls `listener` whenever a font finishes loading, so text can be drawn again; returns the way to stop. */
export function onFontsLoaded(listener: () => void) {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

/** Loads a font so canvases can draw with it. Rejects when it is unknown or not a usable font. */
export function loadFont(id: string): Promise<void> {
  if (ready.has(id)) return Promise.resolve();
  if (failed.has(id)) return Promise.reject(new Error(`Font ${id} failed`));
  const active = loading.get(id);
  if (active) return active;
  const family = fontFamily(id),
    source = isBundledFont(id)
      ? `url(/fonts/${id}.woff2)`
      : table[id]
        ? fromDataUrl(table[id].data)
        : undefined;
  if (!source || typeof FontFace === "undefined") {
    failed.add(id);
    return Promise.reject(new Error(`Font ${id} is not available`));
  }
  const promise = new FontFace(family, source)
    .load()
    .then((face) => {
      document.fonts.add(face);
      ready.add(id);
      for (const l of listeners) l();
    })
    .catch((e) => {
      failed.add(id);
      throw e;
    })
    .finally(() => loading.delete(id));
  loading.set(id, promise);
  return promise;
}

/**
 * The `font-family` list to draw with. A font that has not loaded yet draws in
 * the default, starts loading, and listeners are called once it can be used.
 */
export function fontStackFor(id: string | undefined) {
  if (!id) return DEFAULT_STACK;
  if (ready.has(id)) return stackOf(id);
  void loadFont(id).catch(() => undefined);
  return DEFAULT_STACK;
}
