import { mapPacks } from "../map-packs";
import { PACK_STAMPS, STAMP_PACKS } from "../packs";
import { packSprite } from "../scatter-kinds";
import { assetUrl } from "../search";
import { Field } from "../ui/Field";
import { ScenesTab } from "./ScenesTab";
import {
  BookOpen,
  ExternalLink,
  ImagePlus,
  LoaderCircle,
  PackagePlus,
  Search,
} from "lucide-react";
import type { ReadyApp } from "../app/useAppModel";

export function LibraryPanel({ app }: { app: ReadyApp }) {
  const {
    assetPack,
    assetSearch,
    brush,
    pickMyStamp,
    imageInput,
    packInput,
    importWeb,
    libraryTab,
    map,
    myStamps,
    searchWeb,
    setAssetPack,
    setAssetSearch,
    setBrush,
    setLibraryTab,
    setModal,
    setTool,
    setWebQuery,
    setWebSource,
    t,
    tool,
    webBusy,
    webError,
    webQuery,
    webResults,
    webSource,
  } = app;
  // The collections the map's land is filled from come first.
  const matching = map ? mapPacks(map.settings) : [];
  const option = (p: (typeof STAMP_PACKS)[number]) => (
    <option key={p.key} value={p.key}>
      {p.label}
    </option>
  );
  return (
    <>
      <div className="panel-heading">
        <span className="section-kicker">{t("Library")}</span>
      </div>
      <div className="segmented">
        {["Built-in", "Search web", "My stamps", "Scenes"].map((v) => (
          <button
            key={v}
            className={libraryTab === v ? "active" : ""}
            onClick={() => setLibraryTab(v)}
          >
            {t(v)}
          </button>
        ))}
      </div>
      {libraryTab === "Built-in" && (
        <>
          <Field label={t("Collection")}>
            <select
              value={assetPack}
              onChange={(e) => setAssetPack(e.target.value)}
            >
              {matching.length ? (
                <>
                  <optgroup label={t("Used on this map")}>
                    {STAMP_PACKS.filter((p) => matching.includes(p.key)).map(
                      option,
                    )}
                  </optgroup>
                  <optgroup label={t("Other collections")}>
                    {STAMP_PACKS.filter((p) => !matching.includes(p.key)).map(
                      option,
                    )}
                  </optgroup>
                </>
              ) : (
                STAMP_PACKS.map(option)
              )}
            </select>
          </Field>
          <div className="search-input">
            <Search size={15} />
            <input
              placeholder={t("Search stamps…")}
              value={assetSearch}
              onChange={(e) => setAssetSearch(e.target.value)}
            />
          </div>
          <div className="stamp-grid">
            {[...PACK_STAMPS]
              // Map symbols first; arrows, path pieces and textures last.
              .sort(
                (x, y) =>
                  Number(/arrow|path|texture|element/i.test(x.name)) -
                  Number(/arrow|path|texture|element/i.test(y.name)),
              )
              .filter(
                (a) =>
                  a.pack === assetPack &&
                  a.name.toLowerCase().includes(assetSearch.toLowerCase()),
              )
              .map((a) => (
                <button
                  className={`pack-stamp ${tool === "stamp" && brush.sprite?.src === a.src ? "active" : ""}`}
                  key={a.id}
                  title={a.name}
                  onClick={() => {
                    // Pick a sprite, then click or drag on the map to place it.
                    setBrush((b) => ({
                      ...b,
                      sprite: packSprite(a),
                      layer: "Objects",
                      mask: false,
                    }));
                    setTool("stamp");
                  }}
                >
                  <img src={a.src} alt="" loading="lazy" />
                  <span>{a.name}</span>
                </button>
              ))}
          </div>
          <p className="panel-footnote">
            {STAMP_PACKS.find((p) => p.key === assetPack)?.credit}
          </p>
        </>
      )}
      {libraryTab === "Search web" && (
        <>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void searchWeb();
            }}
          >
            <div className="search-input">
              <Search size={15} />
              <input
                placeholder={t("Search images…")}
                value={webQuery}
                onChange={(e) => setWebQuery(e.target.value)}
              />
            </div>
            <Field label={t("Source")}>
              <select
                value={webSource}
                onChange={(e) => setWebSource(e.target.value)}
              >
                <option value="auto">{t("Auto")}</option>
                <option value="commons">Wikimedia Commons</option>
                <option value="openverse">Openverse</option>
              </select>
            </Field>
            <button
              className="button brass full"
              disabled={webBusy || webQuery.length < 2}
              type="submit"
            >
              {webBusy ? (
                <LoaderCircle className="spin" size={15} />
              ) : (
                <Search size={15} />
              )}{" "}
              {t("Search")}
            </button>
          </form>
          {webError && <p className="error-message">{webError}</p>}
          <div className="web-results">
            {webResults.map((asset) => (
              <button key={asset.id} onClick={() => importWeb(asset)}>
                <img
                  src={assetUrl(asset.thumbnail)}
                  alt={asset.name}
                  loading="lazy"
                />
                <span>{asset.name}</span>
                <small>
                  {asset.license} · {asset.author}
                </small>
              </button>
            ))}
          </div>
          {!webResults.length && !webError && (
            <div className="empty-state">
              <Search size={28} />
              <p>{t("No results")}</p>
            </div>
          )}
        </>
      )}
      {libraryTab === "Scenes" && <ScenesTab app={app} />}
      {libraryTab === "My stamps" && (
        <>
          <button
            className="button subtle full"
            onClick={() => imageInput.current?.click()}
          >
            <ImagePlus size={16} />
            {t("Import image")}
          </button>
          <button
            className="button subtle full"
            onClick={() => packInput.current?.click()}
          >
            <PackagePlus size={16} />
            {t("Import pack")}
          </button>
          <div className="stamp-grid my-stamps">
            {myStamps.map((s) => (
              <button
                key={s.id}
                className={
                  tool === "stamp" && brush.sprite?.src === s.image
                    ? "active"
                    : ""
                }
                onClick={() => void pickMyStamp(s)}
              >
                <img src={s.image} alt="" />
                <span>{s.name}</span>
              </button>
            ))}
          </div>
          {myStamps.length === 0 && (
            <div className="empty-state">
              <ImagePlus size={28} />
              <p>{t("No stamps yet")}</p>
            </div>
          )}
        </>
      )}
      <button className="credits-link" onClick={() => setModal("credits")}>
        <BookOpen size={14} />
        {t("Credits")}
        <ExternalLink size={12} />
      </button>
    </>
  );
}
