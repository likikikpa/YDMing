import { generatorFields } from "./generator-fields";
import { Shuffle } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function CityFields({ app, title }: { app: ReadyApp; title: string }) {
  const { map, regenerate, t } = app;
  const { selectField } = generatorFields(app);
  return (
    <>
      {title === "Size" &&
        selectField("Town size", "citySize", [
          ["hamlet", "Hamlet"],
          ["village", "Village"],
          ["town", "Town"],
          ["city", "City"],
          ["capital", "Capital"],
        ])}
      {title === "Defence" &&
        selectField("Defence", "defense", [
          ["none", "None"],
          ["palisade", "Palisade"],
          ["stone", "Stone wall"],
        ])}
      {title === "Site" &&
        selectField("Site", "site", [
          ["river", "River"],
          ["coast", "Coast"],
          ["hill", "Hill"],
        ])}
      {title === "Layout" && map.kind === "city" && (
        <>
          {selectField("Street layout", "layout", [
            ["organic", "Organic"],
            ["grid", "Grid"],
          ])}
          <button
            className="button subtle full"
            onClick={() => regenerate("buildings", true)}
          >
            <Shuffle size={13} />
            {t("Reroll")} {t("Buildings")}
          </button>
        </>
      )}
    </>
  );
}
