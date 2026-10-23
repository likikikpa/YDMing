import { DEFAULT_SCATTER } from "../scatter-brush";
import type { ScatterSettings as Settings } from "../scatter-brush";
import { packKinds } from "../scatter-kinds";
import { mixIdOf, mixKey } from "../scatter-mixes";
import { Field, Slider } from "../ui/Field";
import type { ReadyApp } from "../app/useAppModel";

/** The stamp tool's scatter brush: what it sows and how thickly. */
export function ScatterSettings({ app }: { app: ReadyApp }) {
  const { assetPack, brush, map, mixes, openMix, setBrush, t, tool } = app;
  if (tool !== "stamp" || map.kind !== "world") return null;
  const s = brush.scatter ?? DEFAULT_SCATTER,
    set = (change: Partial<Settings>) =>
      setBrush((b) => ({ ...b, scatter: { ...s, ...change } })),
    kinds = packKinds(assetPack),
    mixId = mixIdOf(s.kind),
    chosen = mixes.some((m) => m.id === mixId);
  return (
    <>
      <label className="checkbox">
        <input
          type="checkbox"
          checked={s.on}
          onChange={(e) => set({ on: e.target.checked })}
        />
        {t("Scatter")}
      </label>
      {s.on && (
        <>
          <Field label={t("Pictures")}>
            <select
              value={
                chosen || kinds.some((k) => k.key === s.kind) ? s.kind : ""
              }
              onChange={(e) => set({ kind: e.target.value })}
            >
              <option value="">{t("Selected picture")}</option>
              {kinds.map((k) => (
                <option key={k.key} value={k.key}>
                  {t(k.label)}
                </option>
              ))}
              {mixes.length > 0 && (
                <optgroup label={t("Mixes")}>
                  {mixes.map((m) => (
                    <option key={m.id} value={mixKey(m.id)}>
                      {m.name}
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </Field>
          <div className="scatter-mix-buttons">
            <button className="button subtle" onClick={() => openMix()}>
              {t("New mix")}
            </button>
            {chosen && (
              <button className="button subtle" onClick={() => openMix(mixId)}>
                {t("Edit mix")}
              </button>
            )}
          </div>
          <Slider
            label={t("Radius")}
            value={s.radius}
            onChange={(radius) => set({ radius })}
            min={20}
            max={300}
            suffix=" px"
          />
          <Slider
            label={t("Density")}
            value={s.density}
            onChange={(density) => set({ density })}
            min={5}
            max={100}
            suffix="%"
          />
          <Slider
            label={t("Size variety")}
            value={s.variety}
            onChange={(variety) => set({ variety })}
            min={0}
            max={100}
            suffix="%"
          />
          <Slider
            label={t("Colour variety")}
            value={s.tint}
            onChange={(tint) => set({ tint })}
            min={0}
            max={100}
            suffix="%"
          />
          <label className="checkbox">
            <input
              type="checkbox"
              checked={s.flip}
              onChange={(e) => set({ flip: e.target.checked })}
            />
            {t("Flip")}
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={s.turn}
              onChange={(e) => set({ turn: e.target.checked })}
            />
            {t("Rotate")}
          </label>
          <label className="checkbox">
            <input
              type="checkbox"
              checked={s.biomes}
              onChange={(e) => set({ biomes: e.target.checked })}
            />
            {t("Follow biomes")}
          </label>
        </>
      )}
    </>
  );
}
