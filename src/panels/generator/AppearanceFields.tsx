import { Mountain } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";
import { MAP_STYLES, PICKER_STYLES, resolveStyle } from "../../map-styles";
import { FontPicker } from "../../ui/FontPicker";

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
          <FontPicker
            app={app}
            label={t("Label font")}
            empty={t("Default")}
            value={settings.labelFont}
            onChange={(font) => {
              changeSetting("labelFont", font);
              mutateMap((m) => {
                if (font) m.settings.labelFont = font;
                else delete m.settings.labelFont;
              }, "Change label font");
            }}
          />
        </>
      )}
    </>
  );
}
