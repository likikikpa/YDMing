import { BIOME_NAMES } from "../biomes";
import { LAND_BIOMES, defaultBiomes } from "../scatter-habitat";
import type { ScatterMixItem } from "../types";

/** The biomes one mix picture grows on with Follow biomes: tick them, or go back to the built-in rules. */
export function MixBiomes({
  item,
  t,
  onChange,
}: {
  item: ScatterMixItem;
  t: (s: string) => string;
  onChange: (biomes: number[] | undefined) => void;
}) {
  const fallback = defaultBiomes(item.src),
    chosen = item.biomes ?? fallback;
  function toggle(biome: number) {
    const next = chosen.includes(biome)
      ? chosen.filter((b) => b !== biome)
      : [...chosen, biome].sort((a, b) => a - b);
    // Nothing ticked, or the built-in rules again, means no choice of its own.
    const same =
      next.length === fallback.length &&
      next.every((b, i) => b === fallback[i]);
    onChange(next.length && !same ? next : undefined);
  }
  return (
    <div className="mix-biomes">
      {LAND_BIOMES.map((b) => (
        <button
          key={b}
          aria-pressed={chosen.includes(b)}
          className={chosen.includes(b) ? "active" : ""}
          onClick={() => toggle(b)}
        >
          {t(BIOME_NAMES[b])}
        </button>
      ))}
      {item.biomes && (
        <button
          className="mix-biomes-reset"
          onClick={() => onChange(undefined)}
        >
          {t("Default")}
        </button>
      )}
    </div>
  );
}
