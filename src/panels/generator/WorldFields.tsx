import { presetNames } from "../../app/constants";
import { generatorFields } from "./generator-fields";
import { Slider } from "../../ui/Field";
import { ChevronDown, Shuffle } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function WorldFields({ app, title }: { app: ReadyApp; title: string }) {
  const { changeSetting, more, regenerate, setMore, settings, t } = app;
  const { selectField, slider } = generatorFields(app);
  return (
    <>
      {title === "Shape" && (
        <>
          {selectField("Template", "template", Object.entries(presetNames))}
          {slider("Land coverage", "land", 20, 85)}
        </>
      )}
      {title === "Relief" && (
        <>
          {slider("Mountains", "mountains")}
          {slider("Roughness", "roughness")}
          <Slider
            label={t("Sea level")}
            value={Math.round(settings.seaLevel * 100)}
            onChange={(v) => changeSetting("seaLevel", v / 100)}
            min={20}
            max={70}
          />
        </>
      )}
      {title === "Climate" && (
        <>
          {slider("Temperature", "temperature", -30, 30, "°")}
          {slider("Rainfall", "rainfall")}
          {more && (
            <>
              {slider("Latitude span", "latitude", 10, 90, "°")}
              {selectField("Prevailing wind", "wind", [
                ["west", "West"],
                ["east", "East"],
              ])}
            </>
          )}
          <button className="more-link" onClick={() => setMore((v) => !v)}>
            {t(more ? "Less" : "More")}
            <ChevronDown size={11} />
          </button>
        </>
      )}
      {title === "Water" && (
        <>
          {slider("Rivers", "rivers", 0, 24, "")}
          {slider("Lakes", "lakes", 0, 12, "")}
          <button
            className="button subtle full"
            onClick={() => regenerate("water", true)}
          >
            <Shuffle size={13} />
            {t("Reroll")} {t("Water")}
          </button>
        </>
      )}
      {title === "Settlements" && (
        <>
          {slider("Cities", "cities", 0, 20, "")}
          {slider("Towns", "towns", 0, 15, "")}
          {slider("Villages", "villages", 0, 25, "")}
          {more && (
            <>
              {slider("Dungeons", "dungeons", 0, 10, "")}
              {slider("Kingdoms", "kingdoms", 1, 10, "")}
            </>
          )}
          <button className="more-link" onClick={() => setMore((v) => !v)}>
            {t(more ? "Less" : "More")}
          </button>
          <button
            className="button subtle full"
            onClick={() => regenerate("people", true)}
          >
            <Shuffle size={13} />
            {t("Reroll")} {t("Settlements")}
          </button>
        </>
      )}
    </>
  );
}
