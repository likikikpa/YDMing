import { useEffect, useState } from "react";
import { Leaf, Minus, Plus, Search, X } from "lucide-react";
import { getWithLegacy } from "../legacy-keys";
import { imageId, isEmbedded, mixImageId } from "../images";
import { PACK_STAMPS, STAMP_PACKS } from "../packs";
import { MAX_MIX_WEIGHT, withBiomes, withWeight } from "../scatter-mixes";
import { MixBiomes } from "./MixBiomes";
import { Field } from "../ui/Field";
import { uid } from "../types";
import type { Credit, ScatterMixItem } from "../types";
import type { ReadyApp } from "../app/useAppModel";

const nameOf = new Map(PACK_STAMPS.map((a) => [a.src, a.name]));

/** One picture the dialog can add to a mix. */
interface Tile {
  src: string;
  name: string;
  thumb: string;
  extra: Partial<ScatterMixItem>;
}

/** The pictures of My stamps, which hold imported and searched images. */
const MINE = "mine";

/** Makes or changes a scatter mix: pick pictures, then give each a weight. */
export function ScatterMixModal({ app }: { app: ReadyApp }) {
  const {
    assetPack,
    deleteMix,
    mixEdit,
    mixes,
    myStamps,
    project,
    saveMix,
    t,
  } = app;
  const existing = mixes.find((m) => m.id === mixEdit);
  const [name, setName] = useState(existing?.name ?? "");
  const [items, setItems] = useState<ScatterMixItem[]>(existing?.items ?? []);
  const [pack, setPack] = useState(assetPack);
  const [search, setSearch] = useState("");
  /** The picture whose biomes are showing. */
  const [biomesOf, setBiomesOf] = useState("");
  /** The data of imported pictures picked in this dialog, by their `image:` path. */
  const [picked, setPicked] = useState<Record<string, string>>({});
  const [libraryCredits, setLibraryCredits] = useState<Credit[]>([]);
  useEffect(() => {
    getWithLegacy<Credit[]>("ydming-library-credits")
      .then((known) => setLibraryCredits(known || []))
      .catch(() => {});
  }, []);
  const tiles: Tile[] =
    pack === MINE
      ? myStamps
          .filter((s) => isEmbedded(s.image))
          .map((s) => ({
            src: `image:${imageId(s.image!)}`,
            name: s.name,
            thumb: s.image!,
            extra: {
              name: s.name,
              aspect: s.width / s.height,
              ...(s.creditId && { creditId: s.creditId }),
            },
          }))
      : PACK_STAMPS.filter((a) => a.pack === pack).map((a) => ({
          src: a.src,
          name: a.name,
          thumb: a.src,
          extra: {},
        }));
  /** What the picture looks like: a bundled path, or the data of an imported one. */
  const thumbOf = (src: string) => {
    const id = mixImageId(src);
    return id ? (picked[src] ?? project.images?.[id] ?? "") : src;
  };
  function add(tile: Tile) {
    if (mixImageId(tile.src) && !picked[tile.src])
      setPicked((now) => ({ ...now, [tile.src]: tile.thumb }));
    setItems((now) =>
      withWeight(now, tile.src, weight(tile.src) + 1, tile.extra),
    );
  }
  function save() {
    const images: Record<string, string> = {},
      credits: Credit[] = [];
    for (const i of items) {
      const id = mixImageId(i.src),
        data = id && (picked[i.src] ?? project.images?.[id]);
      if (id && data && !project.images?.[id]) images[id] = data;
      const credit =
        i.creditId &&
        (project.credits.find((c) => c.id === i.creditId) ??
          libraryCredits.find((c) => c.id === i.creditId));
      if (credit && !credits.some((c) => c.id === credit.id))
        credits.push(credit);
    }
    saveMix(
      {
        id: existing?.id ?? uid(),
        name: name.trim() || t("Mix"),
        items,
      },
      { images, credits },
    );
  }
  const weight = (src: string) => items.find((i) => i.src === src)?.weight ?? 0;
  const set = (src: string, w: number) =>
    setItems((now) => withWeight(now, src, w));
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
          <option value={MINE}>{t("My stamps")}</option>
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
        {tiles
          .filter((x) => x.name.toLowerCase().includes(search.toLowerCase()))
          .map((x) => (
            <button
              key={x.src}
              className={`pack-stamp ${weight(x.src) ? "active" : ""}`}
              title={x.name}
              onClick={() => add(x)}
            >
              <img src={x.thumb} alt="" loading="lazy" />
              <span>{x.name}</span>
              {weight(x.src) > 0 && (
                <b className="mix-weight">{weight(x.src)}</b>
              )}
            </button>
          ))}
      </div>
      <ul className="mix-items">
        {items.map((i) => (
          <li key={i.src}>
            <img src={thumbOf(i.src)} alt="" />
            <span>{nameOf.get(i.src) ?? i.name ?? i.src}</span>
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
            <button
              aria-label={t("Grows on")}
              aria-pressed={biomesOf === i.src}
              className={i.biomes ? "mix-chosen" : ""}
              onClick={() => setBiomesOf(biomesOf === i.src ? "" : i.src)}
            >
              <Leaf size={13} />
            </button>
            <button aria-label={t("Remove")} onClick={() => set(i.src, 0)}>
              <X size={13} />
            </button>
            {biomesOf === i.src && (
              <MixBiomes
                item={i}
                t={t}
                onChange={(biomes) =>
                  setItems((now) => withBiomes(now, i.src, biomes))
                }
              />
            )}
          </li>
        ))}
      </ul>
      <div className="mix-actions">
        <button
          className="button brass"
          disabled={!items.length}
          onClick={save}
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
