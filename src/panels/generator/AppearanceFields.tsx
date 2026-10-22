import { Mountain } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";
import { MAP_STYLES, PICKER_STYLES, resolveStyle } from "../../map-styles";

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
            {PICKER_STYLES.map((style) => (
              <button
                key={style}
                className={
                  resolveStyle(settings.style) === style ? "active" : ""
                }
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
                {t(MAP_STYLES[style].label)}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}
