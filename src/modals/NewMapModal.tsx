import type { MapKind } from "../types";
import { Field } from "../ui/Field";
import { MapSizeFields } from "../ui/MapSizeFields";
import { Castle, DoorOpen, Globe2, LoaderCircle, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function NewMapModal({ app }: { app: ReadyApp }) {
  const {
    busy,
    createMap,
    lang,
    newKind,
    newName,
    newSeed,
    newSize,
    setNewKind,
    setNewName,
    setNewSeed,
    setNewSize,
    t,
  } = app;
  return (
    <>
      <div className="new-map-types">
        {(
          [
            ["world", Globe2, "World"],
            ["city", Castle, "City"],
            ["dungeon", DoorOpen, "Dungeon"],
          ] as [MapKind, LucideIcon, string][]
        ).map(([kind, Icon, label]) => (
          <button
            key={kind}
            className={newKind === kind ? "active" : ""}
            onClick={() => setNewKind(kind)}
          >
            <Icon size={30} />
            {t(label)}
          </button>
        ))}
      </div>
      <Field label={t("Map name")}>
        <input
          autoFocus
          placeholder={
            newKind === "world"
              ? "The Uncharted Reach"
              : newKind === "city"
                ? "Briarhaven"
                : "The Hollow Sanctum"
          }
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
        />
      </Field>
      <Field label={t("Seed")}>
        <input
          placeholder={lang === "ru" ? "Случайный сид" : "Random seed"}
          value={newSeed}
          onChange={(e) => setNewSeed(e.target.value)}
        />
      </Field>
      {newKind !== "dungeon" && (
        <MapSizeFields t={t} size={newSize} onChange={setNewSize} />
      )}
      <button
        disabled={busy}
        className="button brass full"
        onClick={() => createMap(newKind, newName, newSeed, undefined, newSize)}
      >
        {busy ? (
          <LoaderCircle className="spin" size={16} />
        ) : (
          <Plus size={16} />
        )}{" "}
        {t("Create map")}
      </button>
    </>
  );
}
