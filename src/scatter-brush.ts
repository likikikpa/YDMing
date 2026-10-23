import { kindOf, kindPictures } from "./scatter-kinds";
import type { ScatterOptions, ScatterPicture } from "./scatter";
import { spriteAssets } from "./stamp-brush";
import type { StampAssets, StampSprite } from "./stamp-brush";
import type { MapKind } from "./types";

/** The scatter brush's controls, as the stamp tool's card sets them. */
export interface ScatterSettings {
  on: boolean;
  /** A `ScatterKind` key from the open collection; empty scatters the picked picture alone. */
  kind: string;
  /** The brush's radius, in map pixels. */
  radius: number;
  /** Share of the ground the stamps cover, in percent. */
  density: number;
  /** How far sizes stray from the stamp size, in percent. */
  variety: number;
  flip: boolean;
  /** Turn each stamp as far as its kind allows. */
  turn: boolean;
  /** How far colours stray, in percent. */
  tint: number;
  /** Place only what grows on the biome under each stamp, and nothing on water. */
  biomes: boolean;
}

export const DEFAULT_SCATTER: ScatterSettings = {
  on: false,
  kind: "",
  radius: 80,
  density: 40,
  variety: 50,
  flip: true,
  turn: true,
  tint: 30,
  biomes: true,
};

/** The scatter brush works on world maps only. */
export const scatterMaps: MapKind[] = ["world"];

/** The pictures the brush draws from: the kind's, or else the picked picture. */
export function scatterPool(
  settings: ScatterSettings | undefined,
  sprite: StampSprite | undefined,
  pack: string,
): ScatterPicture[] {
  if (!settings?.on) return [];
  const kind = settings.kind ? kindPictures(pack, settings.kind) : [];
  return kind.length ? kind : sprite ? [{ sprite }] : [];
}

/** The placement options for the settings, with the turn the pool's kind allows. */
export function scatterOptions(
  s: ScatterSettings,
  size: number,
  pool: readonly ScatterPicture[],
): ScatterOptions {
  const spread = (s.variety / 100) * 0.6,
    allowed = pool.length ? (kindOf(pool[0].sprite.src)?.turn ?? 0) : 0;
  return {
    radius: s.radius,
    size,
    density: s.density / 100,
    scale: [1 - spread, 1 + spread],
    flip: s.flip,
    turn: s.turn ? allowed : 0,
    tint: s.tint / 100,
  };
}

/** The credits and pictures of every sprite in the pool, to go with what it places. */
export function poolAssets(pool: readonly ScatterPicture[]): StampAssets {
  const credits: NonNullable<StampAssets["credits"]> = [],
    images: NonNullable<StampAssets["images"]> = {};
  for (const { sprite } of pool) {
    const a = spriteAssets(sprite);
    for (const c of a.credits ?? [])
      if (!credits.some((k) => k.id === c.id)) credits.push(c);
    Object.assign(images, a.images);
  }
  return { credits, images };
}
