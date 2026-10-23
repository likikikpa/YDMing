import { useState } from "react";
import { Minus, Plus, Search, X } from "lucide-react";
import { PACK_STAMPS, STAMP_PACKS } from "../packs";
import { MAX_MIX_WEIGHT, withWeight } from "../scatter-mixes";
import { Field } from "../ui/Field";
import { uid } from "../types";
import type { ScatterMixItem } from "../types";
import type { ReadyApp } from "../app/useAppModel";

const nameOf = new Map(PACK_STAMPS.map((a) => [a.src, a.name]));

/** Makes or changes a scatter mix: pick pictures, then give each a weight. */
export function ScatterMixModal({ app }: { app: ReadyApp }) {
  const { assetPack, deleteMix, mixEdit, mixes, saveMix, t } = app;
  const existing = mixes.find((m) => m.id === mixEdit);
  const [name, setName] = useState(existing?.name ?? "");
  const [items, setItems] = useState<ScatterMixItem[]>(existing?.items ?? []);
  const [pack, setPack] = useState(assetPack);
  const [search, setSearch] = useState("");
  const weight = (src: string) => items.find((i) => i.src === src)?.weight ?? 0;
  const set = (src: string, w: number) => setItems(withWeight(items, src, w));
  return (
    <>
      <Field label={t("Name")}>
        <input
          value={name}
          maxLength={60}
          onChange={(e) => setName(e.target.value)}
        />
      </Field>
      <Field label={t("Collection")}>
        <select value={pack} onChange={(e) => setPack(e.target.value)}>
          {STAMP_PACKS.map((p) => (
            <option key={p.key} value={p.key}>
              {p.label}
            </option>
          ))}
        </select>
      </Field>
      <div className="search-input">
        <Search size={15} />
        <input
          placeholder={t("Search stamps…")}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>
      <div className="stamp-grid mix-grid">
        {PACK_STAMPS.filter(
          (a) =>
            a.pack === pack &&
            a.name.toLowerCase().includes(search.toLowerCase()),
        ).map((a) => (
          <button
            key={a.id}
            className={`pack-stamp ${weight(a.src) ? "active" : ""}`}
            title={a.name}
            onClick={() => set(a.src, weight(a.src) + 1)}
          >
            <img src={a.src} alt="" loading="lazy" />
            <span>{a.name}</span>
            {weight(a.src) > 0 && <b className="mix-weight">{weight(a.src)}</b>}
          </button>
        ))}
      </div>
      <ul className="mix-items">
        {items.map((i) => (
          <li key={i.src}>
            <img src={i.src} alt="" />
            <span>{nameOf.get(i.src) ?? i.src}</span>
            <button
              aria-label={t("Less")}
              onClick={() => set(i.src, i.weight - 1)}
            >
              <Minus size={13} />
            </button>
            <output>{i.weight}</output>
            <button
              aria-label={t("More")}
              disabled={i.weight >= MAX_MIX_WEIGHT}
              onClick={() => set(i.src, i.weight + 1)}
            >
              <Plus size={13} />
            </button>
            <button aria-label={t("Remove")} onClick={() => set(i.src, 0)}>
              <X size={13} />
            </button>
          </li>
        ))}
      </ul>
      <div className="mix-actions">
        <button
          className="button brass"
          disabled={!items.length}
          onClick={() =>
            saveMix({
              id: existing?.id ?? uid(),
              name: name.trim() || t("Mix"),
              items,
            })
          }
        >
          {t("Save")}
        </button>
        {existing && (
          <button
            className="button subtle"
            onClick={() => deleteMix(existing.id)}
          >
            {t("Delete")}
          </button>
        )}
      </div>
    </>
  );
}
