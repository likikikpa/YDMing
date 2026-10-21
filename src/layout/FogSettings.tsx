import { encodeFog, newFogGrid } from "../fog";
import type { ReadyApp } from "../app/useAppModel";

const MODES = [
  ["reveal", "Reveal"],
  ["hide", "Hide"],
  ["room", "Room"],
] as const;

export function FogSettings({ app }: { app: ReadyApp }) {
  const { brush, map, mutateMap, setBrush, t, tool } = app;
  if (tool !== "fog") return null;
  const mode = brush.fog ?? "reveal";
  return (
    <>
      <div className="segmented" role="radiogroup">
        {MODES.filter(([key]) => key !== "room" || map.rooms.length > 0).map(
          ([key, label]) => (
            <button
              key={key}
              role="radio"
              aria-checked={mode === key}
              className={mode === key ? "active" : ""}
              onClick={() => setBrush((b) => ({ ...b, fog: key }))}
            >
              {t(label)}
            </button>
          ),
        )}
      </div>
      <div className="fog-actions">
        <button
          className="button subtle"
          onClick={() =>
            mutateMap((m) => {
              m.fog = encodeFog(newFogGrid(m, true));
            }, "Hide all")
          }
        >
          {t("Hide all")}
        </button>
        <button
          className="button subtle"
          disabled={!map.fog}
          onClick={() =>
            mutateMap((m) => {
              delete m.fog;
            }, "Reveal all")
          }
        >
          {t("Reveal all")}
        </button>
      </div>
    </>
  );
}
