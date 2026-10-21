import { GeneratorSections } from "./GeneratorSections";
import type { MapKind } from "../../types";
import { Field } from "../../ui/Field";
import {
  Castle,
  DoorOpen,
  Globe2,
  Maximize2,
  ScrollText,
  Shuffle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReadyApp } from "../../app/useAppModel";

export function GeneratorPanel({ app }: { app: ReadyApp }) {
  const {
    busy,
    changeSetting,
    lockSeed,
    map,
    openResize,
    project,
    regenerate,
    setLockSeed,
    setModal,
    setNewKind,
    setNewName,
    setPanel,
    setProject,
    settings,
    t,
  } = app;
  return (
    <>
      <div className="panel-heading">
        <span className="section-kicker">{t("Generator")}</span>
      </div>
      <div className="map-type-picker">
        {(
          [
            ["world", Globe2, "World"],
            ["city", Castle, "City"],
            ["dungeon", DoorOpen, "Dungeon"],
          ] as [MapKind, LucideIcon, string][]
        ).map(([kind, Icon, name]) => (
          <button
            key={kind}
            className={map.kind === kind ? "active" : ""}
            onClick={() => {
              if (kind === map.kind) return;
              const existing = project.maps.find((m) => m.kind === kind);
              if (existing)
                setProject({ ...project, activeMapId: existing.id });
              else {
                setNewKind(kind);
                setNewName("");
                setModal("new");
              }
            }}
          >
            <Icon size={23} />
            <span>{t(name)}</span>
          </button>
        ))}
      </div>
      <Field label={t("Seed")}>
        <div className="seed-input">
          <input
            value={settings.seed}
            aria-label={t("Seed")}
            onChange={(e) => changeSetting("seed", e.target.value)}
          />
          <button
            title={t("Reroll")}
            aria-label={t("Reroll seed")}
            onClick={() =>
              changeSetting(
                "seed",
                Math.random().toString(36).slice(2, 10).toUpperCase(),
              )
            }
          >
            <Shuffle size={15} />
          </button>
        </div>
      </Field>
      <label
        className="checkbox lock-seed"
        title={t("Keep the same seed when generating")}
      >
        <input
          type="checkbox"
          checked={lockSeed}
          onChange={(e) => setLockSeed(e.target.checked)}
        />
        {t("Lock seed")}
      </label>
      <GeneratorSections app={app} />
      <button
        className="button brass full generate-button"
        disabled={busy}
        onClick={() => regenerate("all", !lockSeed)}
      >
        <Shuffle size={16} />
        {t("Generate map")}
        <kbd>↵</kbd>
      </button>
      {map.kind !== "dungeon" && (
        <button className="button subtle full" onClick={openResize}>
          <Maximize2 size={14} />
          {t("Resize map")} · {map.cols} × {map.rows}
        </button>
      )}
      {map.kind === "dungeon" && (
        <button
          className="button subtle full"
          onClick={() => setPanel("rooms")}
        >
          <ScrollText size={15} />
          {t("Room key")}
          <span className="count">{map.rooms.length}</span>
        </button>
      )}
    </>
  );
}
