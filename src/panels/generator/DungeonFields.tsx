import { generatorFields } from "./generator-fields";
import { Shuffle } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function DungeonFields({
  app,
  title,
}: {
  app: ReadyApp;
  title: string;
}) {
  const { changeSetting, lang, map, regenerate, settings, t } = app;
  const { selectField, slider } = generatorFields(app);
  return (
    <>
      {title === "Party" && (
        <>
          {slider("Level", "level", 1, 20, "")}
          {slider("Party size", "party", 1, 8, "")}
        </>
      )}
      {title === "Theme" &&
        selectField(
          "Theme",
          "theme",
          [
            "none",
            "abandoned",
            "monstrous",
            "undead",
            "vermin",
            "aberrant",
            "giant",
            "aquatic",
            "underdark",
            "arcane",
            "fire",
            "cold",
            "infernal",
          ].map((v) => [v, v.charAt(0).toUpperCase() + v.slice(1)]),
        )}
      {title === "Layout" && map.kind === "dungeon" && (
        <>
          {slider("Size", "dungeonSize", 24, 90, " cells")}
          {slider("Density", "density", 10, 100)}
          {selectField("Corridors", "corridors", [
            ["winding", "Winding"],
            ["straight", "Straight"],
            ["labyrinth", "Labyrinth"],
          ])}
        </>
      )}
      {title === "Rooms" && (
        <>
          {slider("Room size", "roomSize", 3, 15, " cells")}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.irregular}
              onChange={(e) => changeSetting("irregular", e.target.checked)}
            />
            {lang === "ru" ? "Неровные комнаты" : "Irregular rooms"}
          </label>
          <button
            className="button subtle full"
            onClick={() => regenerate("contents", true)}
          >
            <Shuffle size={13} />
            {t("Refresh contents")}
          </button>
        </>
      )}
      {title === "Doors" && (
        <>
          {selectField("Doors", "doors", [
            ["none", "None"],
            ["basic", "Basic"],
            ["locked", "Locked"],
            ["trapped", "Trapped"],
            ["secret", "Secret"],
          ])}
          <label className="checkbox">
            <input
              type="checkbox"
              checked={settings.stairs}
              onChange={(e) => changeSetting("stairs", e.target.checked)}
            />
            {t("Stairs")}
          </label>
        </>
      )}
      {title === "Grid" &&
        selectField("Grid", "grid", [
          ["square", "Square"],
          ["hex", "Hex"],
          ["none", "None"],
        ])}
    </>
  );
}
