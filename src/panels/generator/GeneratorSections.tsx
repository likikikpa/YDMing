import { presetNames } from "../../app/constants";
import { AppearanceFields } from "./AppearanceFields";
import { CityFields } from "./CityFields";
import { DungeonFields } from "./DungeonFields";
import { WorldFields } from "./WorldFields";
import { ChevronDown } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function GeneratorSections({ app }: { app: ReadyApp }) {
  const { group, map, setGroup, setMore, settings, t } = app;
  const generatorGroups =
    map?.kind === "world"
      ? ["Shape", "Relief", "Climate", "Water", "Settlements", "Appearance"]
      : map?.kind === "city"
        ? ["Size", "Defence", "Site", "Layout", "Appearance"]
        : ["Party", "Theme", "Layout", "Rooms", "Doors", "Grid", "Appearance"];
  return (
    <>
      <div className="generator-sections">
        {generatorGroups.map((title, i) => (
          <section
            className={`generator-section ${group === title ? "expanded" : ""}`}
            key={title}
          >
            <button
              className="accordion-title"
              onClick={() => {
                setGroup(group === title ? "" : title);
                setMore(false);
              }}
            >
              <span className="section-number">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span>{t(title)}</span>
              {group !== title && (
                <small>
                  {title === "Shape"
                    ? presetNames[settings.template]
                    : title === "Appearance"
                      ? t(
                          settings.style === "parchment"
                            ? "Parchment"
                            : "Atlas",
                        )
                      : ""}
                </small>
              )}
              <ChevronDown size={13} />
            </button>
            {group === title && (
              <div className="accordion-content">
                <WorldFields app={app} title={title} />
                <AppearanceFields app={app} title={title} />
                <CityFields app={app} title={title} />
                <DungeonFields app={app} title={title} />
              </div>
            )}
          </section>
        ))}
      </div>
    </>
  );
}
