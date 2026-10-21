import { Mountain } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function AppearanceFields({
  app,
  title,
}: {
  app: ReadyApp;
  title: string;
}) {
  const { changeSetting, mutateMap, settings, t } = app;
  return (
    <>
      {title === "Appearance" && (
        <>
          <div className="style-picker">
            {(["parchment", "atlas", "painted"] as const).map((style) => (
              <button
                key={style}
                className={settings.style === style ? "active" : ""}
                onClick={() => {
                  changeSetting("style", style);
                  mutateMap((m) => {
                    m.settings.style = style;
                    m.heights = m.heights.slice();
                  }, "Change map style");
                }}
              >
                <span className={`style-sample ${style}`}>
                  <Mountain size={24} />
                </span>
                {t(
                  style === "parchment"
                    ? "Parchment"
                    : style === "atlas"
                      ? "Atlas"
                      : "Painted",
                )}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
