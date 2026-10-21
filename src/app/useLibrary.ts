import { useEffect, useRef, useState } from "react";
import { set } from "idb-keyval";
import { fitImage } from "../assets";
import { spriteFromStamp } from "../stamp-brush";
import { getWithLegacy } from "../legacy-keys";
import type { BrushSettings } from "../editor/types";
import { assetUrl, searchImages } from "../search";
import { uid } from "../types";
import type { AssetResult, Credit, MapObject, Project, Tool } from "../types";
import { emptyFit } from "./constants";
import type { ModalName, Panel } from "./constants";

/** The Library panel: built-in packs, web search, imported stamps and snapshots. */
export function useLibrary({
  project,
  projectRef,
  commit,
  notify,
  t,
  brush,
  setModal,
  setPanel,
  setBrush,
  chooseTool,
}: {
  project: Project | null;
  projectRef: React.RefObject<Project | null>;
  commit: (next: Project, label: string) => void;
  notify: (message: string) => void;
  t: (s: string) => string;
  brush: BrushSettings;
  setModal: (modal: ModalName | null) => void;
  setPanel: (panel: Panel) => void;
  setBrush: React.Dispatch<React.SetStateAction<BrushSettings>>;
  chooseTool: (tool: Tool) => void;
}) {
  const imageInput = useRef<HTMLInputElement>(null);
  const [snapshots, setSnapshots] = useState<
    { id: string; name: string; project: Project }[]
  >([]);
  const [snapshotName, setSnapshotName] = useState("");
  const [libraryTab, setLibraryTab] = useState("Built-in");
  const [assetSearch, setAssetSearch] = useState("");
  const [assetPack, setAssetPack] = useState("cartography");
  const [webQuery, setWebQuery] = useState("");
  const [webSource, setWebSource] = useState("auto");
  const [webResults, setWebResults] = useState<AssetResult[]>([]);
  const [webBusy, setWebBusy] = useState(false);
  const [webError, setWebError] = useState("");
  const [myStamps, setMyStamps] = useState<MapObject[]>([]);
  const [fitSource, setFitSource] = useState<Blob | string | null>(null);
  const [fitSettings, setFitSettings] = useState(emptyFit);
  const [fitPreview, setFitPreview] = useState<{
    data: string;
    width: number;
    height: number;
  } | null>(null);
  const [fitBusy, setFitBusy] = useState(false);
  const [fitCredit, setFitCredit] = useState<Credit>({
    id: "",
    name: "",
    author: "",
    license: "Private asset",
    url: "",
  });
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const [sn, st] = await Promise.all([
          getWithLegacy<{ id: string; name: string; project: Project }[]>(
            "ydming-snapshots",
          ),
          getWithLegacy<MapObject[]>("ydming-stamps"),
        ]);
        if (live) {
          setSnapshots(sn || []);
          setMyStamps(st || []);
        }
      } catch {}
    })();
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!fitSource) return;
    let cancelled = false;
    setFitBusy(true);
    const timer = setTimeout(() => {
      void fitImage(fitSource, fitSettings)
        .then((value) => {
          if (!cancelled) setFitPreview(value);
        })
        .catch((e) => notify(e.message))
        .finally(() => {
          if (!cancelled) setFitBusy(false);
        });
    }, 150);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fitSource, fitSettings]);
  // Sprites that match the open map's style rank first.
  const mapStyle = () =>
    project?.maps.find((m) => m.id === project.activeMapId)?.settings.style ||
    "parchment";
  async function searchWeb() {
    if (!webQuery.trim()) return;
    setWebBusy(true);
    setWebError("");
    try {
      const reply = await searchImages(
        `/api/search?${new URLSearchParams({ q: webQuery, source: webSource, style: mapStyle(), commercial: String(project?.commercial || false) })}`,
      );
      if ("results" in reply) {
        setWebResults(reply.results);
        if (!reply.results.length) setWebError(t("No results"));
      } else
        setWebError(
          reply.problem === "message"
            ? reply.message!
            : reply.problem === "offline"
              ? t("Image search needs an internet connection.")
              : t(
                  "Image search is not available here. It needs the YDMing server.",
                ),
        );
    } finally {
      setWebBusy(false);
    }
  }
  async function importWeb(asset: AssetResult) {
    try {
      setWebBusy(true);
      const response = await fetch(assetUrl(asset.image));
      if (!response.ok) throw new Error("The source could not be downloaded.");
      setFitSource(await response.blob());
      setFitSettings({ ...emptyFit });
      setFitCredit({
        id: uid(),
        name: asset.name,
        author: asset.author,
        license: asset.license,
        url: asset.url,
      });
      setFitPreview(null);
      setModal("fit");
    } catch (e) {
      notify(String(e));
    } finally {
      setWebBusy(false);
    }
  }
  async function importLocal(file: File) {
    if (file.size > 10_000_000) {
      notify("Images must be smaller than 10 MB.");
      return;
    }
    setFitSource(file);
    setFitSettings({ ...emptyFit });
    setFitCredit({
      id: uid(),
      name: file.name.replace(/\.[^.]+$/, ""),
      author: "You",
      license: "Private asset",
      url: "",
    });
    setFitPreview(null);
    setModal("fit");
  }
  async function addStamp() {
    if (!fitPreview || !project) return;
    const stamp: MapObject = {
      id: uid(),
      kind: "image",
      x: 600,
      y: 425,
      name: fitCredit.name || "Imported stamp",
      width: 80,
      height: (80 * fitPreview.height) / fitPreview.width,
      rotation: 0,
      layer: "Objects",
      color: brush.color,
      image: fitPreview.data,
      creditId: fitCredit.id,
    };
    const next = [...myStamps, stamp];
    try {
      await set("ydming-stamps", next);
    } catch {
      notify(
        "Stamp storage is unavailable. The project still includes this image.",
      );
    }
    try {
      const known: Credit[] =
        (await getWithLegacy<Credit[]>("ydming-library-credits")) || [];
      await set("ydming-library-credits", [
        ...known.filter((c) => c.id !== fitCredit.id),
        fitCredit,
      ]);
    } catch {}
    setMyStamps(next);
    commit(
      {
        ...project,
        credits: [
          ...project.credits.filter((c) => c.id !== fitCredit.id),
          fitCredit,
        ],
      },
      "Import asset",
    );
    setModal(null);
    setLibraryTab("My stamps");
    setPanel("library");
  }
  /** Makes a stamp from My stamps the stamp tool's picture, like a bundled sprite. */
  async function pickMyStamp(stamp: MapObject) {
    let credit: Credit | undefined;
    try {
      const known =
        (await getWithLegacy<Credit[]>("ydming-library-credits")) || [];
      credit = known.find((c) => c.id === stamp.creditId);
    } catch {}
    chooseTool("stamp");
    setBrush((b) => ({
      ...b,
      sprite: spriteFromStamp(stamp, credit),
      layer: "Objects",
      mask: false,
    }));
  }

  async function takeSnapshot() {
    if (!project) return;
    const next = [
      ...snapshots,
      {
        id: uid(),
        name: snapshotName.trim() || `Snapshot ${snapshots.length + 1}`,
        project: structuredClone(project),
      },
    ];
    try {
      await set("ydming-snapshots", next);
      setSnapshots(next);
      setSnapshotName("");
      notify(t("Snapshot") + " ✓");
    } catch {
      notify("Could not store snapshot. Download a project backup.");
    }
  }
  return {
    imageInput,
    snapshots,
    snapshotName,
    setSnapshotName,
    libraryTab,
    setLibraryTab,
    assetSearch,
    setAssetSearch,
    assetPack,
    setAssetPack,
    webQuery,
    setWebQuery,
    webSource,
    setWebSource,
    webResults,
    webBusy,
    webError,
    myStamps,
    fitSource,
    setFitSource,
    fitSettings,
    setFitSettings,
    fitPreview,
    fitBusy,
    fitCredit,
    setFitCredit,
    searchWeb,
    importWeb,
    importLocal,
    addStamp,
    pickMyStamp,
    takeSnapshot,
  };
}
