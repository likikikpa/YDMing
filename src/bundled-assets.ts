/** Folders under /assets that hold sprites shipped with the app. */
export const BUNDLED_SPRITE_PACKS = [
  "cartography",
  "medieval",
  "gosbell",
  "classic-dungeon",
  "amanz-lite",
  "ai-gen",
];

/** Whether an object's image is a bundled sprite path, which projects store instead of a copy. */
export const isBundledSprite = (path: string) =>
  new RegExp(
    `^/assets/(${BUNDLED_SPRITE_PACKS.join("|")})/[\\w.-]+\\.(png|webp)$`,
  ).test(path);
