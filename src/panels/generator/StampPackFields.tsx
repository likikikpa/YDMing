import { LAND_PACKS, mapPacks, packCredits } from "../../map-packs";
import { STAMP_PACKS } from "../../packs";
import { withPacks } from "../../populate";
import type { ReadyApp } from "../../app/useAppModel";

/**
 * Which Library collections a world's land is filled from, apart from its
 * style. The stamps the generator already placed are placed again at once.
 */
export function StampPackFields({ app }: { app: ReadyApp }) {
  const { map, t, updateMap } = app;
  if (map.kind !== "world") return null;
  const chosen = mapPacks(map.settings),
    toggle = (key: string, on: boolean) => {
      const packs = LAND_PACKS.filter((k) =>
        k === key ? on : chosen.includes(k),
      );
      updateMap(withPacks(map, packs), "Change stamp packs", {
        credits: packCredits(packs),
      });
    };
  return (
    <div className="field stamp-pack-field">
      <span>{t("Stamp packs")}</span>
      <div className="stamp-pack-choice">
        {LAND_PACKS.map((key) => (
          <label className="checkbox" key={key}>
            <input
              type="checkbox"
              checked={chosen.includes(key)}
              onChange={(e) => toggle(key, e.target.checked)}
            />
            {STAMP_PACKS.find((p) => p.key === key)?.label}
          </label>
        ))}
      </div>
    </div>
  );
}
