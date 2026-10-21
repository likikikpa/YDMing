import { ChevronRight } from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";
import { mapTree } from "../map-tree";
import type { MapObject } from "../types";
import { Field } from "../ui/Field";

/** The map a stamp opens: any other map of this world, or a new one. */
export function MapLinkField({ app, o }: { app: ReadyApp; o: MapObject }) {
  const { busy, linkStamp, map, openObject, project, t } = app;
  const linked = project.maps.some((m) => m.id === o.linkedMap);
  return (
    <>
      <Field label={t("Link to map")}>
        <select
          disabled={busy}
          value={linked ? o.linkedMap : ""}
          onChange={(e) => linkStamp(o, e.target.value)}
        >
          <option value="">{t("No link")}</option>
          {mapTree(project.maps)
            .filter((r) => r.map.id !== map.id)
            .map(({ map: m, depth }) => (
              <option key={m.id} value={m.id}>
                {"  ".repeat(depth) + m.name}
              </option>
            ))}
          <option value="new:city">+ {t("New city map")}</option>
          <option value="new:dungeon">+ {t("New dungeon map")}</option>
        </select>
      </Field>
      {(linked ||
        ["city", "village", "castle", "dungeon"].includes(o.kind)) && (
        <button className="button subtle full" onClick={() => openObject(o)}>
          {t("Open linked map")}
          <ChevronRight size={14} />
        </button>
      )}
    </>
  );
}
