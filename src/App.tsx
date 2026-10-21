import { useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  Mountain,
  Globe2,
  Castle,
  DoorOpen,
  ChevronDown,
  ChevronUp,
  Maximize2,
  PaintRoller,
  ChevronRight,
  Undo2,
  Redo2,
  Download,
  Plus,
  MousePointer2,
  Hand,
  Paintbrush,
  Eraser,
  Square,
  Type,
  Pipette,
  Shovel,
  MountainSnow,
  Blend,
  Activity,
  Equal,
  Waves,
  Trees,
  Route,
  Grid2X2,
  Layers,
  SlidersHorizontal,
  Search,
  Eye,
  EyeOff,
  LockKeyhole,
  LockKeyholeOpen,
  MoreHorizontal,
  Minus,
  Maximize,
  Crosshair,
  Check,
  X,
  RotateCcw,
  Shuffle,
  History,
  BookOpen,
  FolderOpen,
  Save,
  Copy,
  Trash2,
  FlipHorizontal2,
  FlipVertical2,
  ArrowUpToLine,
  ArrowDownToLine,
  Group,
  AlignStartVertical,
  AlignStartHorizontal,
  ArrowLeftRight,
  Settings2,
  Pencil,
  Circle,
  Droplets,
  Wind,
  MapPin,
  ImagePlus,
  Upload,
  Camera,
  Expand,
  HelpCircle,
  ScrollText,
  Sparkle,
  Sprout,
  Compass,
  CheckCheck,
  LoaderCircle,
  ExternalLink,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { get, set } from "idb-keyval";
import { inheritCityTerrain } from "./inherit";
import { isMovable, moveLayer, placeLayer } from "./layers";
import {
  clampSize,
  MAX_CELLS,
  MIN_COLS,
  MIN_ROWS,
  resizeMap,
  shiftChildren,
  SIZE_PRESETS,
} from "./mapsize";
import type { Anchor } from "./mapsize";
import {
  BUILTIN_MATERIALS,
  defaultTextures,
  PATTERNS,
  replaceMaterial,
  TEXTURE_SOFT_LIMIT,
  isBuiltinMaterial,
  newTextureLayer,
  paintedCellCount,
} from "./materials";
import {
  setTextureLayers,
  textureColour,
  texturePreview,
} from "./terrain-render";
import { Editor } from "./Editor";
import type { EditorHandle, BrushSettings } from "./Editor";
import { BIOMES, createEmptyMap, SRD } from "./generator";
import { defaultSettings, MAP_COLORS, uid } from "./types";
import type {
  AssetResult,
  Credit,
  GeneratorSettings,
  MapData,
  MapKind,
  MapObject,
  Project,
  SrdEntry,
  StampKind,
  Tool,
  TextureLayer,
  TextureTiling,
} from "./types";
import { translate } from "./i18n";
import { cursorStatus, useCursorStatus } from "./status";
import { searchImages } from "./search";
import { loadProject, saveProject, validateProject } from "./storage";
import { creditsText, download, exportMap, slug } from "./export";
import { fitImage } from "./assets";
import type { FitSettings } from "./assets";
import { toolDescriptions } from "./tools";
import kenney from "./data/kenney.json";

const HISTORY_LIMIT = 100;
type Panel = "generate" | "layers" | "library" | "history" | "tools" | "rooms";
const toolInfo: Record<Tool, [string, LucideIcon, string]> = {
  select: ["Select", MousePointer2, "V"],
  hand: ["Pan", Hand, "H"],
  brush: ["Brush", Paintbrush, "B"],
  pencil: ["Pencil", Pencil, "N"],
  eraser: ["Eraser", Eraser, "E"],
  fill: ["Fill bucket", Droplets, "G"],
  line: ["Line", Minus, "L"],
  rectangle: ["Rectangle", Square, "U"],
  ellipse: ["Ellipse", Circle, "O"],
  text: ["Text", Type, "T"],
  eyedropper: ["Eyedropper", Pipette, "I"],
  raise: ["Raise terrain", Mountain, "A"],
  dig: ["Dig terrain", Shovel, "Q"],
  smooth: ["Smooth", Blend, "R"],
  flatten: ["Flatten", Equal, "F"],
  roughen: ["Roughen", Activity, "Y"],
  biome: ["Biome override", Sprout, "C"],
  terrain: ["Terrain paint", PaintRoller, ""],
  stamp: ["Place stamp", Trees, "S"],
  river: ["River", Waves, "W"],
  ridge: ["Mountain range", MountainSnow, "M"],
  island: ["Island", Globe2, "Z"],
  road: ["Road", Route, "K"],
  wall: ["Wall", Castle, "J"],
  room: ["Room", Grid2X2, "P"],
};
const paintTools: Tool[] = [
  "brush",
  "pencil",
  "eraser",
  "fill",
  "line",
  "rectangle",
  "ellipse",
];
// Terrain tools ignore colour and layers, so those controls are hidden for them.
const colourTools: Tool[] = [
  "brush",
  "pencil",
  "fill",
  "line",
  "rectangle",
  "ellipse",
  "text",
  "stamp",
];
const layerTools: Tool[] = [...paintTools, "stamp"];
const presetNames: Record<string, string> = {
  continents: "Continents",
  pangaea: "Pangaea",
  archipelago: "Archipelago",
  peninsula: "Peninsula",
  island: "Single island",
};
const emptyFit: FitSettings = {
  removeBackground: false,
  tolerance: 18,
  trim: true,
  parchment: false,
  outline: false,
  shadow: false,
  posterize: false,
};
function IconButton({
  icon: Icon,
  title,
  hint,
  keys,
  side,
  onClick,
  active,
  disabled,
  children,
}: {
  icon: LucideIcon;
  title: string;
  /** One or two sentences explaining what the button does. */
  hint?: string;
  keys?: string;
  side?: "right" | "bottom";
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  children?: ReactNode;
}) {
  return (
    <button
      className={`icon-button ${active ? "active" : ""}`}
      aria-label={title}
      data-tip={title}
      data-tip-hint={hint}
      data-tip-keys={keys}
      data-tip-side={side}
      aria-pressed={active}
      disabled={disabled}
      onClick={onClick}
    >
      <Icon size={18} />
      {children}
    </button>
  );
}
interface Tip {
  x: number;
  y: number;
  side: "right" | "bottom";
  title: string;
  hint?: string;
  keys?: string;
}
/**
 * Shows a name, a description and the shortcut next to whatever the pointer
 * rests on. Plain `title` attributes are adopted too, so every button gets the
 * same instant tooltip instead of the browser's slow, plain one.
 */
function TooltipLayer() {
  const [tip, setTip] = useState<Tip | null>(null);
  useEffect(() => {
    let timer = 0;
    const hide = () => {
      window.clearTimeout(timer);
      setTip(null);
    };
    const show = (el: HTMLElement) => {
      if (el.hasAttribute("title")) {
        el.dataset.tip = el.getAttribute("title") || "";
        el.removeAttribute("title");
        // Icon-only buttons must keep an accessible name once the title is gone.
        if (!el.getAttribute("aria-label") && !el.textContent?.trim())
          el.setAttribute("aria-label", el.dataset.tip);
      }
      const title = el.dataset.tip;
      if (!title) return;
      const rect = el.getBoundingClientRect(),
        side =
          (el.dataset.tipSide as Tip["side"] | undefined) ||
          (rect.right < 120 ? "right" : "bottom");
      const next: Tip = {
        side,
        title,
        hint: el.dataset.tipHint,
        keys: el.dataset.tipKeys,
        x: side === "right" ? rect.right + 10 : rect.left + rect.width / 2,
        y: side === "right" ? rect.top + rect.height / 2 : rect.bottom + 8,
      };
      window.clearTimeout(timer);
      // Moving along a row of tools swaps the tip at once; a first hover waits briefly.
      timer = window.setTimeout(() => setTip(next), 120);
    };
    const over = (e: Event) => {
      // Fingers have no hover; a tooltip after a tap would just get in the way.
      if ((e as PointerEvent).pointerType === "touch") return;
      const el = (e.target as HTMLElement | null)?.closest?.(
        "[data-tip],[title]",
      ) as HTMLElement | null;
      if (el) show(el);
      else hide();
    };
    document.addEventListener("pointerover", over);
    document.addEventListener("focusin", over);
    document.addEventListener("pointerdown", hide);
    document.addEventListener("focusout", hide);
    window.addEventListener("blur", hide);
    return () => {
      hide();
      document.removeEventListener("pointerover", over);
      document.removeEventListener("focusin", over);
      document.removeEventListener("pointerdown", hide);
      document.removeEventListener("focusout", hide);
      window.removeEventListener("blur", hide);
    };
  }, []);
  if (!tip) return null;
  return (
    <div
      role="tooltip"
      className={`tooltip tip-${tip.side}`}
      style={{
        left: Math.min(
          Math.max(tip.x, tip.side === "right" ? 0 : 140),
          window.innerWidth - (tip.side === "right" ? 0 : 140),
        ),
        top: tip.y,
      }}
    >
      <div className="tooltip-title">
        <b>{tip.title}</b>
        {tip.keys && <kbd>{tip.keys}</kbd>}
      </div>
      {tip.hint && <p>{tip.hint}</p>}
    </div>
  );
}
/** Width and height in cells, with presets; shows the size in pixels too. */
function MapSizeFields({
  t,
  size,
  onChange,
}: {
  t: (s: string) => string;
  size: { cols: number; rows: number };
  onChange: (size: { cols: number; rows: number }) => void;
}) {
  const preset = SIZE_PRESETS.find(
    (p) => p.cols === size.cols && p.rows === size.rows,
  );
  return (
    <>
      <Field label={t("Map size")}>
        <select
          value={preset?.name ?? "custom"}
          onChange={(e) => {
            const p = SIZE_PRESETS.find((p) => p.name === e.target.value);
            if (p) onChange({ cols: p.cols, rows: p.rows });
          }}
        >
          {SIZE_PRESETS.map((p) => (
            <option key={p.name} value={p.name}>
              {t(p.name)} · {p.cols} × {p.rows}
            </option>
          ))}
          <option value="custom">{t("Custom")}</option>
        </select>
      </Field>
      <div className="size-fields">
        {(["cols", "rows"] as const).map((key) => (
          <label key={key}>
            {t(key === "cols" ? "Width" : "Height")}
            <input
              type="number"
              min={key === "cols" ? MIN_COLS : MIN_ROWS}
              max={MAX_CELLS}
              value={size[key]}
              onChange={(e) => onChange({ ...size, [key]: +e.target.value })}
              onBlur={() => onChange(clampSize(size.cols, size.rows))}
            />
          </label>
        ))}
        <span>
          {t("cells")} · {clampSize(size.cols, size.rows).cols * 5} ×{" "}
          {clampSize(size.cols, size.rows).rows * 5} px
        </span>
      </div>
      <p className="panel-footnote">
        {t("Up to 640 × 640 cells (3200 × 3200 px).")}
      </p>
    </>
  );
}
function ZoomReadout() {
  return <>{Math.round(useCursorStatus().zoom)}</>;
}
function CursorReadout({ world }: { world: boolean }) {
  const status = useCursorStatus();
  return (
    <>
      <span>
        X <b>{status.x}</b>
      </span>
      <span>
        Y <b>{status.y}</b>
      </span>
      {world && (
        <span>
          ↟ <b>{status.height} m</b>
        </span>
      )}
      <span>{BIOMES[status.biome] || "Auto"}</span>
    </>
  );
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Slider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  suffix = "%",
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  suffix?: string;
}) {
  return (
    <label className="slider-field">
      <span>
        {label}
        <output>
          {value}
          {suffix}
        </output>
      </span>
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        value={value}
        style={
          {
            "--progress": `${((value - min) / (max - min)) * 100}%`,
          } as React.CSSProperties
        }
        onChange={(e) => onChange(+e.target.value)}
      />
    </label>
  );
}
function HexColorField({
  value,
  onChange,
}: {
  value: string;
  onChange: (value: string) => void;
}) {
  const [draft, setDraft] = useState(value);
  useEffect(() => setDraft(value), [value]);
  return (
    <input
      aria-label="Hex colour"
      value={draft}
      maxLength={7}
      spellCheck={false}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        if (/^#[0-9a-f]{6}$/i.test(next)) onChange(next);
      }}
      onBlur={() => {
        if (!/^#[0-9a-f]{6}$/i.test(draft)) setDraft(value);
      }}
    />
  );
}
function generateAsync(
  kind: MapKind,
  settings: GeneratorSettings,
  name?: string,
  id?: string,
  map?: MapData,
  group?: string,
): Promise<MapData> {
  return new Promise((resolve, reject) => {
    const worker = new Worker(
      new URL("./generator.worker.ts", import.meta.url),
      { type: "module" },
    );
    worker.onmessage = (e) => {
      worker.terminate();
      e.data.error ? reject(new Error(e.data.error)) : resolve(e.data.result);
    };
    worker.onerror = (e) => {
      worker.terminate();
      reject(new Error(e.message));
    };
    worker.postMessage({
      requestId: uid(),
      kind,
      settings,
      name,
      id,
      map,
      group,
    });
  });
}
export default function App() {
  const [project, setProject] = useState<Project | null>(null),
    projectRef = useRef<Project | null>(null),
    [lang, setLang] = useState(
      () => localStorage.getItem("atlasforge-lang") || "en",
    ),
    [panel, setPanel] = useState<Panel>("generate"),
    [tool, setTool] = useState<Tool>("select"),
    [selected, setSelected] = useState<string[]>([]),
    [settings, setSettings] = useState(defaultSettings),
    [lockSeed, setLockSeed] = useState(false),
    [brush, setBrush] = useState<BrushSettings>({
      size: 48,
      strength: 55,
      opacity: 100,
      hardness: 85,
      color: "#344a39",
      biome: 6,
      material: "sand",
      stamp: "tree",
      sprite: { src: "/assets/cartography/treePine.png", name: "Pine tree" },
      snap: false,
      pressure: true,
      layer: "Objects",
    }),
    [toolCardOpen, setToolCardOpen] = useState(() => {
      try {
        return localStorage.getItem("atlasforge-tool-card") !== "closed";
      } catch {
        return true;
      }
    }),
    // Each tool keeps its own size, strength and opacity between switches.
    toolBrushes = useRef<
      Partial<
        Record<Tool, Pick<BrushSettings, "size" | "strength" | "opacity" | "hardness">>
      >
    >({}),
    [textureVersion, setTextureVersion] = useState(0),
    [secondary, setSecondary] = useState("#eee6ce"),
    [recentColors, setRecentColors] = useState<string[]>([]),
    [contours, setContours] = useState(false),
    [player, setPlayer] = useState(false),
    [hidePanels, setHidePanels] = useState(false),
    // On a phone the side panel is a sheet that slides up over the map.
    [sheet, setSheet] = useState(false),
    [saveState, setSaveState] = useState("Saved locally"),
    [saveError, setSaveError] = useState(""),
    [busy, setBusy] = useState(false),
    [toast, setToast] = useState(""),
    [modal, setModal] = useState<
      "new" | "export" | "credits" | "help" | "fit" | "resize" | null
    >(null),
    [menu, setMenu] = useState(false),
    [group, setGroup] = useState("Shape"),
    [more, setMore] = useState(false),
    [history, setHistory] = useState<{ project: Project; label: string }[]>([]),
    [historyIndex, setHistoryIndex] = useState(0),
    [snapshots, setSnapshots] = useState<
      { id: string; name: string; project: Project }[]
    >([]),
    [snapshotName, setSnapshotName] = useState(""),
    [newKind, setNewKind] = useState<MapKind>("world"),
    [newName, setNewName] = useState(""),
    [newSeed, setNewSeed] = useState(""),
    [newSize, setNewSize] = useState<{ cols: number; rows: number }>(
      SIZE_PRESETS[0],
    ),
    [resize, setResize] = useState<{ cols: number; rows: number; anchor: Anchor }>(
      { cols: 240, rows: 170, anchor: { x: 0.5, y: 0.5 } },
    ),
    [exportFormat, setExportFormat] = useState("png"),
    [exportScale, setExportScale] = useState(2),
    [exportSecrets, setExportSecrets] = useState(true),
    [libraryTab, setLibraryTab] = useState("Built-in"),
    [assetSearch, setAssetSearch] = useState(""),
    [assetPack, setAssetPack] = useState("cartography"),
    [webQuery, setWebQuery] = useState(""),
    [webSource, setWebSource] = useState("commons"),
    [webResults, setWebResults] = useState<AssetResult[]>([]),
    [webBusy, setWebBusy] = useState(false),
    [webError, setWebError] = useState(""),
    [myStamps, setMyStamps] = useState<MapObject[]>([]),
    [fitSource, setFitSource] = useState<Blob | string | null>(null),
    [fitSettings, setFitSettings] = useState(emptyFit),
    [fitPreview, setFitPreview] = useState<{
      data: string;
      width: number;
      height: number;
    } | null>(null),
    [fitBusy, setFitBusy] = useState(false),
    [fitCredit, setFitCredit] = useState<Credit>({
      id: "",
      name: "",
      author: "",
      license: "Private asset",
      url: "",
    }),
    [srdDetail, setSrdDetail] = useState<SrdEntry | null>(null),
    [roomDetail, setRoomDetail] = useState<string | null>(null);
  // Points placed so far for a river that has not been approved yet.
  const [riverCount, setRiverCount] = useState(0);
  const editor = useRef<EditorHandle>(null),
    fileInput = useRef<HTMLInputElement>(null),
    imageInput = useRef<HTMLInputElement>(null),
    textureInput = useRef<HTMLInputElement>(null),
    coverInput = useRef<HTMLInputElement>(null),
    toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const t = (s: string) => translate(lang, s);
  const historyRef = useRef(history),
    indexRef = useRef(historyIndex);
  historyRef.current = history;
  indexRef.current = historyIndex;
  const map = project?.maps.find((m) => m.id === project.activeMapId);
  const textures = useMemo(
    () => project?.textures ?? defaultTextures(),
    [project?.textures],
  );
  useEffect(() => {
    let active = true;
    void setTextureLayers(textures).then(() => {
      if (active) setTextureVersion((v) => v + 1);
    });
    return () => {
      active = false;
    };
  }, [textures]);
  /** Shrinks an image to one seamless-size tile and uses it for a texture layer. */
  async function uploadTexture(id: string, file: File) {
    try {
      const bitmap = await createImageBitmap(file),
        canvas = document.createElement("canvas");
      canvas.width = canvas.height = 128;
      canvas.getContext("2d")!.drawImage(bitmap, 0, 0, 128, 128);
      const image = canvas.toDataURL("image/png");
      changeTextures((list) => {
        list.find((n) => n.id === id)!.image = image;
      }, "Texture image");
      const cells = project ? paintedCellCount(project.maps, id) : 0;
      if (cells)
        notify(
          `${t("Texture replaced on painted cells:")} ${cells}`,
        );
    } catch {
      notify(t("That image could not be read."));
    }
  }
  /**
   * Uses an image as a layer's map-wide cover, which painting that layer
   * unveils. It is shrunk to at most 2048 px and stored as JPEG to keep saves small.
   */
  async function uploadCover(id: string, file: File) {
    try {
      const bitmap = await createImageBitmap(file),
        fit = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height)),
        canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * fit));
      canvas.height = Math.max(1, Math.round(bitmap.height * fit));
      canvas
        .getContext("2d")!
        .drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const cover = canvas.toDataURL("image/jpeg", 0.85);
      changeTextures((list) => {
        const n = list.find((n) => n.id === id)!;
        n.cover = cover;
        n.tiling = "unveil";
      }, "Texture map image");
    } catch {
      notify(t("That image could not be read."));
    }
  }
  /** Adds a custom texture layer, warning once the soft limit is passed, and selects it. */
  function addTexture() {
    const id = uid();
    changeTextures(
      (list) => list.push(newTextureLayer(id, list, t("Texture"))),
      "Add texture layer",
    );
    setActiveTexture(id);
    setBrush((b) => ({ ...b, material: id }));
    if (textures.length >= TEXTURE_SOFT_LIMIT)
      notify(
        `${t("Many texture layers can slow the map down.")} ${textures.length + 1}/${TEXTURE_SOFT_LIMIT}`,
      );
  }
  /** Deletes a texture layer; ground painted with it on every map becomes `to`. */
  function deleteTexture(id: string, to: string | null) {
    if (!project || isBuiltinMaterial(id)) return;
    const next = structuredClone(project);
    next.textures = (next.textures ?? defaultTextures()).filter(
      (l) => l.id !== id,
    );
    for (const m of next.maps) replaceMaterial(m, id, to);
    commit(next, "Delete texture layer");
    setActiveTexture("grass");
    if (brush.material === id) setBrush((b) => ({ ...b, material: to ?? "" }));
  }
  function openResize() {
    if (!map) return;
    setResize({ cols: map.cols, rows: map.rows, anchor: { x: 0.5, y: 0.5 } });
    setModal("resize");
  }
  /** Applies the Resize dialog: new cells are sea, child maps keep their spot. */
  function applyResize() {
    if (!project || !map) return;
    const next = resizeMap(map, resize.cols, resize.rows, resize.anchor),
      ox = (next.origin?.x ?? 0) - (map.origin?.x ?? 0),
      oy = (next.origin?.y ?? 0) - (map.origin?.y ?? 0),
      maps = project.maps.map((m) => (m.id === map.id ? next : { ...m }));
    shiftChildren(maps, map.id, ox, oy);
    commit({ ...project, maps }, `Resize map · ${next.cols} × ${next.rows}`);
    setModal(null);
    setSelected([]);
    requestAnimationFrame(() => editor.current?.fit());
  }
  /** Replaces the project's texture layers as one undo step. */
  const changeTextures = (
    change: (layers: TextureLayer[]) => void,
    label: string,
  ) => {
    if (!project) return;
    const next = structuredClone(textures);
    change(next);
    commit({ ...project, textures: next }, label);
  };
  const selection = map?.objects.filter((o) => selected.includes(o.id)) || [];
  projectRef.current = project;
  const notify = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(""), 4200);
  };
  function commit(next: Project, label: string) {
    next = { ...next, updatedAt: new Date().toISOString() };
    setProject(next);
    // Refs keep two commits in the same tick consistent, and the cap stops a
    // long session from holding hundreds of full map copies in memory.
    const kept = [
      ...historyRef.current.slice(0, indexRef.current + 1),
      { project: next, label },
    ].slice(-HISTORY_LIMIT);
    historyRef.current = kept;
    indexRef.current = kept.length - 1;
    setHistory(kept);
    setHistoryIndex(kept.length - 1);
    setSaveState("Saving…");
  }
  function updateMap(next: MapData, label: string) {
    const p = projectRef.current;
    if (!p) return;
    commit(
      { ...p, maps: p.maps.map((m) => (m.id === next.id ? next : m)) },
      label,
    );
  }
  function mutateMap(change: (m: MapData) => void, label: string) {
    if (!map) return;
    const next = structuredClone(map);
    change(next);
    updateMap(next, label);
  }
  function undo() {
    if (historyIndex < 1) return;
    setProject(history[historyIndex - 1].project);
    setHistoryIndex(historyIndex - 1);
    setSelected([]);
  }
  function redo() {
    if (historyIndex >= history.length - 1) return;
    setProject(history[historyIndex + 1].project);
    setHistoryIndex(historyIndex + 1);
    setSelected([]);
  }
  function chooseTool(next: Tool) {
    const { size, strength, opacity, hardness } = brush;
    toolBrushes.current[tool] = { size, strength, opacity, hardness };
    const saved = toolBrushes.current[next];
    if (saved) setBrush((b) => ({ ...b, ...saved }));
    setTool(next);
    if (
      [
        "brush",
        "pencil",
        "eraser",
        "fill",
        "line",
        "rectangle",
        "ellipse",
      ].includes(next)
    )
      setBrush((b) =>
        b.mask && ["brush", "eraser"].includes(next)
          ? b
          : { ...b, layer: "Paint", mask: false },
      );
    else setBrush((b) => ({ ...b, mask: false }));
    if (next === "stamp") {
      setPanel("library");
      setBrush((b) => ({ ...b, layer: "Objects", mask: false }));
    }
  }
  function color(value: string) {
    setBrush((b) => ({ ...b, color: value }));
    setRecentColors((prev) =>
      [value, ...prev.filter((c) => c !== value)].slice(0, 8),
    );
  }
  useEffect(() => {
    let live = true;
    (async () => {
      let initial: Project | undefined;
      try {
        initial = await loadProject();
      } catch {
        setSaveError(
          "Browser storage is unavailable. Download a project backup.",
        );
      }
      if (!initial) {
        const world = createEmptyMap("world", defaultSettings);
        initial = {
          version: 1,
          id: uid(),
          name: "The Eldermere Reach",
          maps: [world],
          activeMapId: world.id,
          credits: [],
          commercial: false,
          updatedAt: new Date().toISOString(),
        };
      }
      if (live) {
        setProject(initial);
        setHistory([{ project: initial, label: "Starting map" }]);
      }
      try {
        const [sn, st] = await Promise.all([
          get("atlasforge-snapshots"),
          get("atlasforge-stamps"),
        ]);
        if (live) {
          setSnapshots(sn || []);
          setMyStamps(st || []);
        }
      } catch {}
    })().catch((e) => notify(String(e)));
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (map) {
      setSettings(map.settings);
      setGroup(
        map.kind === "world" ? "Shape" : map.kind === "city" ? "Size" : "Party",
      );
    }
    setSelected([]);
    setRoomDetail(null);
  }, [map?.id]);
  useEffect(() => {
    if (!project) return;
    setSaveState("Saving…");
    const timer = setTimeout(() => {
      void saveProject(project)
        .then(() => {
          setSaveState("Saved locally");
          setSaveError("");
        })
        .catch(() => {
          setSaveState("Unsaved");
          setSaveError("Local save failed. Download a project backup.");
        });
    }, 700);
    return () => clearTimeout(timer);
  }, [project]);
  useEffect(() => {
    localStorage.setItem("atlasforge-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
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
  useEffect(() => {
    function keyboard(e: KeyboardEvent) {
      const typing =
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement;
      // While a river is being placed these keys belong to it, so Enter must
      // not regenerate the map and Backspace must not delete objects.
      if (tool === "river" && riverCount > 0 && !typing && !modal) {
        if (e.key === "Enter") {
          e.preventDefault();
          if (riverCount >= 2) editor.current?.finishRiver();
          return;
        }
        if (e.key === "Escape") {
          editor.current?.cancelRiver();
          return;
        }
        if (
          e.key === "Backspace" ||
          e.key === "Delete" ||
          ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z" && !e.shiftKey)
        ) {
          e.preventDefault();
          editor.current?.undoRiverPoint();
          return;
        }
      }
      if (e.key === "Escape") {
        setModal(null);
        setMenu(false);
        setSrdDetail(null);
        setSelected([]);
        return;
      }
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement ||
        e.target instanceof HTMLSelectElement
      )
        return;
      if (busy || modal || srdDetail) return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        saveProjectFile();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "g") {
        e.preventDefault();
        groupObjects();
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "d") {
        e.preventDefault();
        duplicate();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        e.preventDefault();
        deleteObjects();
        return;
      }
      if (e.key === "Tab") {
        e.preventDefault();
        setHidePanels((x) => !x);
        return;
      }
      // Only when nothing else has focus: Enter on a focused button must not regenerate the map.
      if (
        e.key === "Enter" &&
        !modal &&
        (e.target === document.body ||
          (e.target as HTMLElement).classList?.contains("interaction-canvas"))
      ) {
        void regenerate("all", !lockSeed);
        return;
      }
      if (e.key === "[" || e.key === "]") {
        setBrush((b) => ({
          ...b,
          size: Math.max(4, Math.min(240, b.size + (e.key === "[" ? -4 : 4))),
        }));
        return;
      }
      if (e.key.toLowerCase() === "x") {
        const old = brush.color;
        color(secondary);
        setSecondary(old);
        return;
      }
      if (e.key.toLowerCase() === "d") {
        color(MAP_COLORS[0]);
        setSecondary("#eee6ce");
        return;
      }
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const entry = Object.entries(toolInfo).find(
        ([, v]) => v[2] === e.key.toUpperCase(),
      );
      if (entry) chooseTool(entry[0] as Tool);
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  });
  async function regenerate(part = "all", reroll = false) {
    if (!map || !project || busy) return;
    setBusy(true);
    const nextSettings = {
      ...settings,
      seed: reroll
        ? Math.random().toString(36).slice(2, 10).toUpperCase()
        : settings.seed,
    };
    try {
      const result = await generateAsync(
        map.kind,
        nextSettings,
        map.name,
        map.id,
        map,
        part,
      );
      if (part === "all" && map.kind === "city" && map.parentPosition) {
        const parent = project.maps.find((m) => m.id === map.parentId);
        if (parent?.kind === "world")
          inheritCityTerrain(parent, result, map.parentPosition);
      }
      updateMap(
        result,
        `${part === "all" ? "Generate map" : `Reroll ${part}`} · ${nextSettings.seed}`,
      );
      setSettings(nextSettings);
      setSelected([]);
      notify(
        lang === "ru"
          ? "Карта создана."
          : "Map generated.",
      );
    } catch (e) {
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  async function createMap(
    kind: MapKind,
    name: string,
    seed?: string,
    parent?: MapObject,
    size?: { cols: number; rows: number },
  ) {
    if (!project || !map) return;
    setBusy(true);
    try {
      let s = {
        ...defaultSettings,
        ...map.settings,
        seed: seed || Math.random().toString(36).slice(2, 10).toUpperCase(),
        grid: kind === "dungeon" ? ("square" as const) : ("none" as const),
      };
      if (parent) {
        const i =
          Math.floor((parent.y / map.height) * map.rows) * map.cols +
          Math.floor((parent.x / map.width) * map.cols);
        s = {
          ...s,
          site:
            map.heights[i] < map.settings.seaLevel + 0.06 ? "coast" : "river",
        };
      }
      const next = createEmptyMap(kind, s, name || undefined, uid(), size);
      const updated = structuredClone(map);
      if (parent) {
        next.parentId = map.id;
        next.parentPosition = { x: parent.x, y: parent.y };
        updated.objects.find((o) => o.id === parent.id)!.linkedMap = next.id;
      }
      commit(
        {
          ...project,
          maps: [
            ...project.maps.map((m) => (m.id === map.id ? updated : m)),
            next,
          ],
          activeMapId: next.id,
        },
        `Create ${kind} map`,
      );
      setModal(null);
      setSettings(next.settings);
      setSelected([]);
      setTool("select");
      setPanel("generate");
    } catch (e) {
      notify(String(e));
    } finally {
      setBusy(false);
    }
  }
  function openObject(o: MapObject) {
    if (!project) return;
    if (o.linkedMap) {
      setProject({ ...project, activeMapId: o.linkedMap });
      return;
    }
    if (["city", "village", "castle", "dungeon"].includes(o.kind)) {
      void createMap(
        o.kind === "dungeon" ? "dungeon" : "city",
        o.name,
        `${map?.settings.seed}-${o.id}`,
        o,
      );
    } else {
      setSelected([o.id]);
    }
  }
  function updateSelected(change: Partial<MapObject>, label = "Edit object") {
    mutateMap((m) => {
      for (const o of m.objects)
        if (
          selected.includes(o.id) &&
          !m.layers.find((l) => l.id === o.layer)?.locked
        )
          Object.assign(o, change);
    }, label);
  }
  function deleteObjects() {
    if (!selected.length) return;
    mutateMap((m) => {
      m.objects = m.objects.filter(
        (o) =>
          !selected.includes(o.id) ||
          m.layers.find((l) => l.id === o.layer)?.locked,
      );
    }, "Delete objects");
    setSelected([]);
  }
  function duplicate() {
    if (!selection.length) return;
    const ids: string[] = [];
    mutateMap((m) => {
      m.objects.push(
        ...selection.map((o) => {
          const id = uid();
          ids.push(id);
          return { ...o, id, x: o.x + 15, y: o.y + 15, group: undefined };
        }),
      );
    }, "Duplicate objects");
    setSelected(ids);
  }
  function groupObjects() {
    if (selection.length < 2) return;
    const group = uid();
    updateSelected({ group }, "Group objects");
    notify(t("Group"));
  }
  function arrange(mode: string) {
    if (!selection.length) return;
    mutateMap((m) => {
      const list = m.objects.filter((o) => selected.includes(o.id));
      if (mode === "front" || mode === "back") {
        m.objects =
          mode === "front"
            ? [...m.objects.filter((o) => !selected.includes(o.id)), ...list]
            : [...list, ...m.objects.filter((o) => !selected.includes(o.id))];
      } else if (mode === "left") {
        const x = Math.min(...list.map((o) => o.x - o.width / 2));
        list.forEach((o) => (o.x = x + o.width / 2));
      } else if (mode === "top") {
        const y = Math.min(...list.map((o) => o.y - o.height / 2));
        list.forEach((o) => (o.y = y + o.height / 2));
      } else if (list.length > 2) {
        list.sort((a, b) => a.x - b.x);
        const lo = list[0].x,
          hi = list.at(-1)!.x;
        list.forEach(
          (o, i) => (o.x = lo + ((hi - lo) * i) / (list.length - 1)),
        );
      }
    }, "Arrange objects");
  }
  function saveProjectFile() {
    if (!project) return;
    download(
      new Blob([JSON.stringify(project)], { type: "application/json" }),
      `${slug(project.name)}.atlasforge`,
    );
    setMenu(false);
  }
  async function openProjectFile(file: File) {
    try {
      if (file.size > 60_000_000)
        throw new Error("Project files must be smaller than 60 MB.");
      const p = validateProject(JSON.parse(await file.text()));
      setProject(p);
      setHistory([{ project: p, label: "Open project" }]);
      setHistoryIndex(0);
      setMenu(false);
      setSelected([]);
      notify(lang === "ru" ? "Проект открыт." : "Project opened.");
    } catch (e) {
      notify(String(e));
    }
  }
  async function searchWeb() {
    if (!webQuery.trim()) return;
    setWebBusy(true);
    setWebError("");
    try {
      const reply = await searchImages(
        `/api/search?${new URLSearchParams({ q: webQuery, source: webSource, commercial: String(project?.commercial || false) })}`,
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
              : t("Image search is not available here. It needs the Atlasforge server."),
        );
    } finally {
      setWebBusy(false);
    }
  }
  async function importWeb(asset: AssetResult) {
    try {
      setWebBusy(true);
      const response = await fetch(
        `/api/image?${new URLSearchParams({ url: asset.image })}`,
      );
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
      await set("atlasforge-stamps", next);
    } catch {
      notify(
        "Stamp storage is unavailable. The project still includes this image.",
      );
    }
    try {
      const known: Credit[] = (await get("atlasforge-library-credits")) || [];
      await set("atlasforge-library-credits", [
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
  async function dropMyStamp(stamp: MapObject) {
    const p = projectRef.current;
    if (!p) return;
    const active = p.maps.find((m) => m.id === p.activeMapId)!;
    const next = structuredClone(active),
      o = { ...stamp, id: uid(), x: 600, y: 425 };
    next.objects.push(o);
    let credits = p.credits;
    try {
      const known: Credit[] = (await get("atlasforge-library-credits")) || [];
      const credit = known.find((c) => c.id === stamp.creditId);
      if (credit && !credits.some((c) => c.id === credit.id))
        credits = [...credits, credit];
    } catch {}
    commit(
      { ...p, maps: p.maps.map((m) => (m.id === next.id ? next : m)), credits },
      "Place imported stamp",
    );
    setSelected([o.id]);
    chooseTool("select");
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
      await set("atlasforge-snapshots", next);
      setSnapshots(next);
      setSnapshotName("");
      notify(t("Snapshot") + " ✓");
    } catch {
      notify("Could not store snapshot. Download a project backup.");
    }
  }
  const changeSetting = <K extends keyof GeneratorSettings>(
    key: K,
    value: GeneratorSettings[K],
  ) => setSettings((s) => ({ ...s, [key]: value }));
  const selectField = (
    label: string,
    key: keyof GeneratorSettings,
    values: [string, string][],
  ) => (
    <Field label={t(label)}>
      <select
        value={String(settings[key])}
        onChange={(e) => changeSetting(key, e.target.value as never)}
      >
        {values.map(([v, l]) => (
          <option value={v} key={v}>
            {t(l)}
          </option>
        ))}
      </select>
    </Field>
  );
  const slider = (
    label: string,
    key: keyof GeneratorSettings,
    min = 0,
    max = 100,
    suffix = "%",
  ) => (
    <Slider
      label={t(label)}
      value={Number(settings[key])}
      onChange={(v) => changeSetting(key, v as never)}
      min={min}
      max={max}
      suffix={suffix}
    />
  );
  const generatorGroups =
    map?.kind === "world"
      ? ["Shape", "Relief", "Climate", "Water", "Settlements", "Appearance"]
      : map?.kind === "city"
        ? ["Size", "Defence", "Site", "Layout", "Appearance"]
        : ["Party", "Theme", "Layout", "Rooms", "Doors", "Grid", "Appearance"];
  const toggleLayer = (id: string, key: "visible" | "locked") =>
    mutateMap((m) => {
      const l = m.layers.find((l) => l.id === id)!;
      l[key] = !l[key];
    }, "Update layer");
  const primaryTools: Tool[][] = [
    ["select", "hand"],
    ["brush", "rectangle", "text", "eyedropper"],
    ["raise", "dig", "smooth", "ridge", "terrain"],
    ["stamp", "river"],
    ["eraser"],
  ];
  const [activeLayer, setActiveLayer] = useState("Objects");
  const [dragLayer, setDragLayer] = useState<string | null>(null);
  const [dragTexture, setDragTexture] = useState<string | null>(null);
  const [activeTexture, setActiveTexture] = useState("grass");
  const [replaceWith, setReplaceWith] = useState("grass");
  if (!project || !map)
    return (
      <div className="loading-screen wood">
        <Mountain size={54} />
        <h1>ATLASFORGE</h1>
        <LoaderCircle className="spin" size={20} />
      </div>
    );
  const currentRoom = map.rooms.find((r) => r.id === roomDetail);
  return (
    <div
      className={`app ${hidePanels ? "panels-hidden" : ""} ${sheet ? "sheet-open" : ""}`}
    >
      <TooltipLayer />
      <header className="topbar wood">
        <button
          className="brand"
          onClick={() => setMenu((v) => !v)}
          aria-label="Project menu"
        >
          <span className="brand-mark">
            <Mountain size={27} />
          </span>
          <span>
            ATLAS<span className="brand-gold">FORGE</span>
          </span>
          <ChevronDown size={13} />
        </button>
        <div className="top-divider" />
        <nav className="map-breadcrumb" aria-label="Maps">
          <button
            className={map.kind === "world" ? "current" : ""}
            onClick={() => {
              const world = project.maps.find((m) => m.kind === "world");
              if (world) setProject({ ...project, activeMapId: world.id });
              else {
                setNewKind("world");
                setModal("new");
              }
            }}
          >
            <Globe2 size={16} />
            {t("World")}
          </button>
          {map.parentId && (
            <>
              <ChevronRight size={13} />
              <button
                onClick={() =>
                  setProject({ ...project, activeMapId: map.parentId! })
                }
              >
                {project.maps.find((m) => m.id === map.parentId)?.name}
              </button>
            </>
          )}
          {map.kind !== "world" && (
            <>
              <ChevronRight size={13} />
              <span className="current">{map.name}</span>
            </>
          )}
          <button
            className="add-map"
            title={t("New map")}
            aria-label={t("New map")}
            onClick={() => {
              setNewName("");
              setNewSeed("");
              setModal("new");
            }}
          >
            <Plus size={15} />
          </button>
        </nav>
        <div className="header-actions">
          <span
            className={`save-state ${saveState === "Unsaved" ? "error" : ""}`}
          >
            {saveState === "Saving…" ? (
              <LoaderCircle className="spin" size={13} />
            ) : (
              <CheckCheck size={14} />
            )}
            <span>{t(saveState)}</span>
          </span>
          <div className="undo-group">
            <IconButton
              icon={Undo2}
              title={t("Undo")}
              keys="Ctrl Z"
              side="bottom"
              onClick={undo}
              disabled={historyIndex === 0 || busy}
            />
            <IconButton
              icon={Redo2}
              title={t("Redo")}
              keys="Ctrl Shift Z"
              side="bottom"
              onClick={redo}
              disabled={historyIndex >= history.length - 1 || busy}
            />
          </div>
          <button
            className="language-button"
            title="English / Русский"
            onClick={() => setLang((l) => (l === "en" ? "ru" : "en"))}
          >
            {lang === "en" ? "EN" : "RU"}
          </button>
          <button
            className="button brass export-button"
            onClick={() => setModal("export")}
          >
            <Download size={15} />
            {t("Export map")}
            <ChevronDown size={13} />
          </button>
        </div>
      </header>
      {menu && (
        <>
          <div className="menu-dismiss" onClick={() => setMenu(false)} />
          <div className="project-menu wood">
            <div className="menu-title">{project.name}</div>
            <button
              onClick={() => {
                setModal("new");
                setMenu(false);
              }}
            >
              <Plus size={16} />
              {t("New map")}
            </button>
            <button onClick={() => fileInput.current?.click()}>
              <FolderOpen size={16} />
              {t("Open project")}
            </button>
            <button onClick={saveProjectFile}>
              <Save size={16} />
              {t("Save project")}
              <kbd>Ctrl S</kbd>
            </button>
            <hr />
            <small>{t("Maps in this project")}</small>
            {project.maps.map((m) => (
              <button
                key={m.id}
                onClick={() => {
                  setProject({ ...project, activeMapId: m.id });
                  setMenu(false);
                }}
              >
                {m.kind === "world" ? (
                  <Globe2 size={15} />
                ) : m.kind === "city" ? (
                  <Castle size={15} />
                ) : (
                  <DoorOpen size={15} />
                )}
                <span>{m.name}</span>
                {m.id === map.id && <Check size={14} />}
              </button>
            ))}
            <hr />
            <button
              onClick={() => {
                setModal("credits");
                setMenu(false);
              }}
            >
              <BookOpen size={16} />
              {t("Credits")}
            </button>
            <button
              onClick={() => {
                setModal("help");
                setMenu(false);
              }}
            >
              <HelpCircle size={16} />
              {t("Keyboard shortcuts")}
            </button>
          </div>
        </>
      )}
      <main className="workspace">
        <aside className="toolrail wood" aria-label="Map tools">
          {primaryTools.map((tools, i) => (
            <div className="tool-group" key={i}>
              {tools.map((key) => {
                const [name, Icon, shortcut] = toolInfo[key];
                return (
                  <IconButton
                    key={key}
                    icon={Icon}
                    title={t(name)}
                    hint={t(toolDescriptions[key])}
                    keys={shortcut || undefined}
                    side="right"
                    active={tool === key}
                    onClick={() => chooseTool(key)}
                  />
                );
              })}
            </div>
          ))}
          {tool === "river" && (
            <div className="tool-group">
              <IconButton
                icon={Check}
                title={t("Approve river")}
                hint={t("Draw the river through the points you placed. Enter does the same.")}
                keys="Enter"
                side="right"
                active={riverCount >= 2}
                disabled={riverCount < 2}
                onClick={() => editor.current?.finishRiver()}
              />
              <IconButton
                icon={Undo2}
                title={t("Remove last point")}
                keys="Backspace"
                side="right"
                disabled={riverCount === 0}
                onClick={() => editor.current?.undoRiverPoint()}
              />
              <IconButton
                icon={X}
                title={t("Cancel river")}
                keys="Esc"
                side="right"
                disabled={riverCount === 0}
                onClick={() => editor.current?.cancelRiver()}
              />
            </div>
          )}
          <IconButton
            icon={MoreHorizontal}
            title={t("More tools")}
            hint={t("Every tool, with what it does.")}
            side="right"
            active={panel === "tools"}
            onClick={() => setPanel(panel === "tools" ? "generate" : "tools")}
          />
          <div className="rail-colors">
            <input
              aria-label="Primary colour"
              type="color"
              value={brush.color}
              onChange={(e) => color(e.target.value)}
            />
            <input
              aria-label="Secondary colour"
              type="color"
              value={secondary}
              onChange={(e) => setSecondary(e.target.value)}
            />
            <button
              title="Swap colours · X"
              aria-label="Swap colours"
              onClick={() => {
                color(secondary);
                setSecondary(brush.color);
              }}
            >
              <ArrowLeftRight size={11} />
            </button>
          </div>
          <div className="rail-bottom">
            <IconButton
              icon={HelpCircle}
              title={t("Keyboard shortcuts")}
              onClick={() => setModal("help")}
            />
          </div>
        </aside>
        <section className="canvas-workspace wood" aria-label="Map workspace">
          <div className="workspace-heading">
            <div>
              <span className="eyebrow">
                <span className="tiny-diamond" />
                {t(
                  map.kind === "world"
                    ? "World map"
                    : map.kind === "city"
                      ? "City map"
                      : "Dungeon map",
                )}
                <span className="heading-index">
                  / {String(project.maps.indexOf(map) + 1).padStart(2, "0")}
                </span>
              </span>
              <h1>
                <input
                  aria-label={t("Map name")}
                  value={map.name}
                  onChange={(e) => {
                    const value = e.target.value;
                    setProject({
                      ...project,
                      maps: project.maps.map((m) =>
                        m.id === map.id ? { ...m, name: value } : m,
                      ),
                    });
                  }}
                />
              </h1>
            </div>
            <div className="workspace-toggles">
              <IconButton
                icon={Grid2X2}
                title={t("Grid")}
                hint={t("Show or hide the square grid over the map.")}
                active={map.settings.grid !== "none"}
                onClick={() => {
                  mutateMap(
                    (m) =>
                      (m.settings.grid =
                        m.settings.grid === "none" ? "square" : "none"),
                    "Toggle grid",
                  );
                }}
              />
              <IconButton
                icon={Waves}
                title={t("Contours")}
                hint={t("Draw height contour lines over the land.")}
                active={contours}
                onClick={() => setContours((v) => !v)}
              />
              <IconButton
                icon={Crosshair}
                title={t("Snap")}
                hint={t("Snap dragged objects to a grid.")}
                active={brush.snap}
                onClick={() => setBrush((b) => ({ ...b, snap: !b.snap }))}
              />
              <IconButton
                icon={player ? Eye : EyeOff}
                title={t(player ? "Player view" : "GM view")}
                hint={t(
                  "Switch between what you see as GM and what players see. Player view hides GM-only secrets.",
                )}
                active={player}
                onClick={() => setPlayer((v) => !v)}
              />
            </div>
          </div>
          <Editor
            ref={editor}
            map={map}
            tool={tool}
            brush={brush}
            selected={selected}
            setSelected={setSelected}
            onChange={updateMap}
            onOpen={openObject}
            onColor={color}
            onRiverPoints={setRiverCount}
            contours={contours}
            player={player}
            textureVersion={textureVersion}
            onStatus={cursorStatus.set}
          />
          <div className="map-corner-note">
            <span className="seed-dot" />
            SEED <b>{map.settings.seed}</b>
            <span>·</span>
            {t(
              map.settings.style === "parchment"
                ? "Parchment"
                : map.settings.style === "atlas"
                  ? "Atlas"
                  : "Painted",
            )}
          </div>
          <div className="view-controls wood">
            <IconButton
              icon={Minus}
              title={t("Zoom out")}
              onClick={() => editor.current?.zoom(0.8)}
            />
            <button
              className="zoom-label"
              title={t("Fit map")}
              onClick={() => editor.current?.fit()}
            >
              <ZoomReadout />
              <span>%</span>
            </button>
            <IconButton
              icon={Plus}
              title={t("Zoom in")}
              onClick={() => editor.current?.zoom(1.25)}
            />
            <span className="control-divider" />
            <IconButton
              icon={Maximize}
              title={t("Fit map")}
              keys="0"
              onClick={() => editor.current?.fit()}
            />
          </div>
          <button
            className="sheet-toggle button brass"
            aria-label={sheet ? t("Close") : t("Tool settings")}
            onClick={() => setSheet((v) => !v)}
          >
            {sheet ? <X size={18} /> : <SlidersHorizontal size={18} />}
          </button>
          {busy && (
            <div className="busy-overlay">
              <div className="busy-card wood">
                <LoaderCircle className="spin" size={27} />
                <h3>{lang === "ru" ? "Создаём карту…" : "Generating…"}</h3>
              </div>
            </div>
          )}
          {hidePanels && (
            <button
              className="show-panels button wood"
              onClick={() => setHidePanels(false)}
            >
              <Layers size={15} />
              Tab
            </button>
          )}
        </section>
        <aside className="sidebar wood">
          <section
            className={`tool-card ${toolCardOpen ? "" : "collapsed"}`}
            aria-label={t("Current tool")}
          >
            <button
              className="tool-card-title"
              aria-expanded={toolCardOpen}
              title={t(toolCardOpen ? "Collapse" : "Expand")}
              onClick={() => {
                const open = !toolCardOpen;
                setToolCardOpen(open);
                try {
                  localStorage.setItem("atlasforge-tool-card", open ? "open" : "closed");
                } catch {
                  // Storage can be unavailable (private mode); the card still works.
                }
              }}
            >
              <span className="section-kicker">{t("Current tool")}</span>
              <strong>{t(toolInfo[tool][0])}</strong>
              {toolInfo[tool][2] && <kbd>{toolInfo[tool][2]}</kbd>}
              <ChevronDown size={13} />
            </button>
            {toolCardOpen && (
              <div className="tool-card-body">
                {selection.length > 0 && (
                  <section className="selection-panel">
                    <div className="section-kicker">
                      {t("Selected object")}{" "}
                      <button
                        className="plain-button"
                        onClick={() => setSelected([])}
                      >
                        <X size={13} />
                      </button>
                    </div>
                    <input
                      className="object-name"
                      aria-label={t("Name")}
                      value={selection[0].name}
                      onChange={(e) => updateSelected({ name: e.target.value })}
                    />
                    <div className="transform-fields">
                      {(["x", "y", "width", "height", "rotation"] as const).map(
                        (key, i) => (
                          <label key={key}>
                            {["X", "Y", "W", "H", "°"][i]}
                            <input
                              aria-label={`Object ${key}`}
                              type="number"
                              value={Math.round(selection[0][key])}
                              min={
                                key === "width" || key === "height" ? 4 : undefined
                              }
                              onChange={(e) =>
                                updateSelected({ [key]: Number(e.target.value) })
                              }
                            />
                          </label>
                        ),
                      )}
                    </div>
                    <div className="object-actions">
                      {(
                        [
                          [
                            FlipHorizontal2,
                            "Flip horizontal",
                            () => updateSelected({ flipX: !selection[0].flipX }),
                          ],
                          [
                            FlipVertical2,
                            "Flip vertical",
                            () => updateSelected({ flipY: !selection[0].flipY }),
                          ],
                          [Copy, "Duplicate", duplicate],
                          [Trash2, "Delete", deleteObjects],
                          [Group, "Group", groupObjects],
                          [AlignStartVertical, "Align left", () => arrange("left")],
                          [AlignStartHorizontal, "Align top", () => arrange("top")],
                          [
                            ArrowLeftRight,
                            "Distribute horizontally",
                            () => arrange("distribute"),
                          ],
                          [ArrowUpToLine, "Bring forward", () => arrange("front")],
                          [ArrowDownToLine, "Send backward", () => arrange("back")],
                        ] as [LucideIcon, string, () => void][]
                      ).map(([icon, title, fn]) => (
                        <IconButton
                          key={title}
                          icon={icon}
                          title={t(title)}
                          onClick={fn}
                        />
                      ))}
                    </div>
                    {map.kind === "city" && (
                      <>
                        <Field label={t("Owner")}>
                          <input
                            value={selection[0].owner || ""}
                            onChange={(e) =>
                              updateSelected({ owner: e.target.value })
                            }
                          />
                        </Field>
                        <Field label={t("Notes for the GM")}>
                          <textarea
                            rows={2}
                            value={selection[0].notes || ""}
                            onChange={(e) =>
                              updateSelected({ notes: e.target.value })
                            }
                          />
                        </Field>
                      </>
                    )}
                    {["city", "village", "castle", "dungeon"].includes(
                      selection[0].kind,
                    ) && (
                      <button
                        className="button subtle full"
                        onClick={() => openObject(selection[0])}
                      >
                        {t("Open linked map")}
                        <ChevronRight size={14} />
                      </button>
                    )}
                  </section>
                )}
                {tool !== "select" && tool !== "hand" && (
                  <div className="tool-settings">
                    {!["river", "island", "room", "text", "eyedropper", "fill"].includes(
                      tool,
                    ) && (
                      <Slider
                        label={t("Brush size")}
                        value={brush.size}
                        onChange={(v) => setBrush((b) => ({ ...b, size: v }))}
                        min={4}
                        max={200}
                        suffix=" px"
                      />
                    )}
                    {["raise", "dig", "smooth", "flatten", "roughen", "ridge"].includes(
                      tool,
                    ) ? (
                      <Slider
                        label={t("Strength")}
                        value={brush.strength}
                        onChange={(v) => setBrush((b) => ({ ...b, strength: v }))}
                        min={5}
                      />
                    ) : (
                      paintTools.includes(tool) && (
                        <Slider
                          label={t("Opacity")}
                          value={brush.opacity}
                          onChange={(v) => setBrush((b) => ({ ...b, opacity: v }))}
                          min={5}
                        />
                      )
                    )}
                    {tool === "terrain" && (
                      <>
                        <Slider
                          label={t("Edge hardness")}
                          value={brush.hardness}
                          onChange={(v) =>
                            setBrush((b) => ({ ...b, hardness: v }))
                          }
                          min={0}
                        />
                        <div className="material-swatches" role="radiogroup">
                          {[...textures]
                            .reverse()
                            .map((l) => (
                              <button
                                key={l.id}
                                role="radio"
                                aria-checked={brush.material === l.id}
                                className={
                                  brush.material === l.id ? "active" : ""
                                }
                                title={t(l.name)}
                                onClick={() =>
                                  setBrush((b) => ({ ...b, material: l.id }))
                                }
                              >
                                <img
                                  alt=""
                                  src={texturePreview(l, map.settings.style)}
                                />
                                <span>{t(l.name)}</span>
                              </button>
                            ))}
                          <button
                            role="radio"
                            aria-checked={brush.material === ""}
                            className={`auto ${brush.material === "" ? "active" : ""}`}
                            title={t("Back to the biome's own ground")}
                            onClick={() =>
                              setBrush((b) => ({ ...b, material: "" }))
                            }
                          >
                            <span className="auto-swatch">A</span>
                            <span>{t("Auto")}</span>
                          </button>
                          <button
                            title={t("Add texture layer")}
                            onClick={addTexture}
                          >
                            <span className="auto-swatch">
                              <Plus size={15} />
                            </span>
                            <span>{t("New")}</span>
                          </button>
                        </div>
                        {(() => {
                          const l = textures.find((l) => l.id === brush.material);
                          if (!l) return null;
                          return (
                            <div className="texture-actions">
                              <button
                                className="button subtle"
                                onClick={() => {
                                  setActiveTexture(l.id);
                                  textureInput.current?.click();
                                }}
                              >
                                <ImagePlus size={13} />
                                {t(l.image ? "Replace image" : "Use an image")}
                              </button>
                              <button
                                className="button subtle"
                                onClick={() => {
                                  setActiveTexture(l.id);
                                  setPanel("layers");
                                }}
                              >
                                {t("Edit texture")}
                              </button>
                            </div>
                          );
                        })()}
                      </>
                    )}
                    {tool === "biome" && (
                      <Field label={t("Biome")}>
                        <select
                          value={brush.biome}
                          onChange={(e) =>
                            setBrush((b) => ({ ...b, biome: +e.target.value }))
                          }
                        >
                          {BIOMES.map((name, i) =>
                            // Sea (12) is decided by height, so it is not paintable.
                            i === 12 ? null : (
                              <option key={name} value={i}>
                                {name}
                              </option>
                            ),
                          )}
                        </select>
                      </Field>
                    )}
                    {colourTools.includes(tool) && (
                      <>
                        <div className="colour-palette">
                          {MAP_COLORS.map((c) => (
                            <button
                              aria-label={`Colour ${c}`}
                              title={c}
                              key={c}
                              style={{ background: c }}
                              className={brush.color === c ? "active" : ""}
                              onClick={() => color(c)}
                            />
                          ))}
                        </div>
                        {recentColors.length > 0 && (
                          <div className="recent-colors">
                            {recentColors.map((c) => (
                              <button
                                key={c}
                                title={c}
                                aria-label={`Recent colour ${c}`}
                                style={{ background: c }}
                                onClick={() => color(c)}
                              />
                            ))}
                          </div>
                        )}
                        <div className="hex-input">
                          <input
                            aria-label="Colour picker"
                            type="color"
                            value={brush.color}
                            onChange={(e) => color(e.target.value)}
                          />
                          <HexColorField value={brush.color} onChange={color} />
                          <span>HEX</span>
                        </div>
                      </>
                    )}
                    {layerTools.includes(tool) && (
                      <Field label={t("Active layer")}>
                        <select
                          value={brush.layer}
                          onChange={(e) =>
                            setBrush((b) => ({ ...b, layer: e.target.value }))
                          }
                        >
                          {map.layers.map((l) => (
                            <option value={l.id} key={l.id}>
                              {t(l.name)}
                              {l.locked ? " 🔒" : ""}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                    {!["river", "island", "room", "text", "eyedropper", "fill"].includes(
                      tool,
                    ) && (
                      <label className="checkbox">
                        <input
                          type="checkbox"
                          checked={brush.pressure}
                          onChange={(e) =>
                            setBrush((b) => ({ ...b, pressure: e.target.checked }))
                          }
                        />
                        {t("Pressure sensitivity")}
                      </label>
                    )}
                  </div>
                )}
              </div>
            )}
          </section>
          <div className="panel-tabs">
            {(
              [
                ["generate", SlidersHorizontal, "Generator"],
                ["layers", Layers, "Layers"],
                ["library", Trees, "Library"],
                ["history", History, "History"],
              ] as [Panel, LucideIcon, string][]
            ).map(([id, Icon, label]) => (
              <button
                key={id}
                className={panel === id ? "active" : ""}
                title={t(label)}
                onClick={() => setPanel(id)}
              >
                <Icon size={17} />
                <span>{t(label)}</span>
              </button>
            ))}
          </div>
          <div className="panel-scroll">
            {panel === "generate" && (
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
                        const existing = project.maps.find(
                          (m) => m.kind === kind,
                        );
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
                <div className="generator-sections">
                  {generatorGroups.map((title, i) => (
                    <section
                      className={`generator-section ${group === title ? "expanded" : ""}`}
                      key={title}
                    >
                      <button
                        className="accordion-title"
                        onClick={() => {
                          setGroup(group === title ? "" : title);
                          setMore(false);
                        }}
                      >
                        <span className="section-number">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <span>{t(title)}</span>
                        {group !== title && (
                          <small>
                            {title === "Shape"
                              ? presetNames[settings.template]
                              : title === "Appearance"
                                ? t(
                                    settings.style === "parchment"
                                      ? "Parchment"
                                      : "Atlas",
                                  )
                                : ""}
                          </small>
                        )}
                        <ChevronDown size={13} />
                      </button>
                      {group === title && (
                        <div className="accordion-content">
                          {title === "Shape" && (
                            <>
                              {selectField(
                                "Template",
                                "template",
                                Object.entries(presetNames),
                              )}
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
                                onChange={(v) =>
                                  changeSetting("seaLevel", v / 100)
                                }
                                min={20}
                                max={70}
                              />
                            </>
                          )}
                          {title === "Climate" && (
                            <>
                              {slider(
                                "Temperature",
                                "temperature",
                                -30,
                                30,
                                "°",
                              )}
                              {slider("Rainfall", "rainfall")}
                              {more && (
                                <>
                                  {slider(
                                    "Latitude span",
                                    "latitude",
                                    10,
                                    90,
                                    "°",
                                  )}
                                  {selectField("Prevailing wind", "wind", [
                                    ["west", "West"],
                                    ["east", "East"],
                                  ])}
                                </>
                              )}
                              <button
                                className="more-link"
                                onClick={() => setMore((v) => !v)}
                              >
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
                              <button
                                className="more-link"
                                onClick={() => setMore((v) => !v)}
                              >
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
                          {title === "Appearance" && (
                            <>
                              <div className="style-picker">
                                {(
                                  ["parchment", "atlas", "painted"] as const
                                ).map((style) => (
                                  <button
                                    key={style}
                                    className={
                                      settings.style === style ? "active" : ""
                                    }
                                    onClick={() => {
                                      changeSetting("style", style);
                                      mutateMap((m) => {
                                        m.settings.style = style;
                                        m.heights = m.heights.slice();
                                      }, "Change map style");
                                    }}
                                  >
                                    <span className={`style-sample ${style}`}>
                                      <Mountain size={24} />
                                    </span>
                                    {t(
                                      style === "parchment"
                                        ? "Parchment"
                                        : style === "atlas"
                                          ? "Atlas"
                                          : "Painted",
                                    )}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
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
                              ].map((v) => [
                                v,
                                v.charAt(0).toUpperCase() + v.slice(1),
                              ]),
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
                                  onChange={(e) =>
                                    changeSetting("irregular", e.target.checked)
                                  }
                                />
                                {lang === "ru"
                                  ? "Неровные комнаты"
                                  : "Irregular rooms"}
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
                                  onChange={(e) =>
                                    changeSetting("stairs", e.target.checked)
                                  }
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
                        </div>
                      )}
                    </section>
                  ))}
                </div>
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
            )}
            <input
              ref={textureInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadTexture(activeTexture, file);
              }}
            />
            <input
              ref={coverInput}
              type="file"
              accept="image/*"
              hidden
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = "";
                if (file) void uploadCover(activeTexture, file);
              }}
            />
            {panel === "layers" && (
              <>
                <div className="panel-heading">
                  <span className="section-kicker">{t("Layers")}</span>
                </div>
                <div className="layers-list">
                  {[...map.layers].reverse().map((l) => (
                    <div
                      className={`layer-row ${activeLayer === l.id ? "selected" : ""} ${dragLayer && dragLayer !== l.id && isMovable(l) ? "drop-target" : ""}`}
                      key={l.id}
                      draggable={isMovable(l)}
                      onDragStart={(e) => {
                        setDragLayer(l.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragLayer(null)}
                      onDragOver={(e) => {
                        if (dragLayer && isMovable(l)) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = dragLayer;
                        setDragLayer(null);
                        if (id && id !== l.id)
                          mutateMap((m) => {
                            placeLayer(m.layers, id, l.id);
                          }, "Reorder layers");
                      }}
                    >
                      <IconButton
                        icon={l.visible ? Eye : EyeOff}
                        title={t(l.visible ? "Hide layer" : "Show layer")}
                        active={!l.visible}
                        onClick={() => toggleLayer(l.id, "visible")}
                      />
                      <button
                        className="layer-name"
                        onClick={() => {
                          setActiveLayer(l.id);
                          setBrush((b) => ({ ...b, layer: l.id }));
                        }}
                      >
                        <span className={`layer-thumbnail layer-${l.id}`}>
                          <Layers size={15} />
                        </span>
                        <span>{t(l.name)}</span>
                      </button>
                      {isMovable(l) && (
                        <span className="layer-order">
                          <IconButton
                            icon={ChevronUp}
                            title={t("Move layer up")}
                            onClick={() =>
                              mutateMap((m) => {
                                moveLayer(m.layers, l.id, 1);
                              }, "Reorder layers")
                            }
                          />
                          <IconButton
                            icon={ChevronDown}
                            title={t("Move layer down")}
                            onClick={() =>
                              mutateMap((m) => {
                                moveLayer(m.layers, l.id, -1);
                              }, "Reorder layers")
                            }
                          />
                        </span>
                      )}
                      <IconButton
                        icon={l.locked ? LockKeyhole : LockKeyholeOpen}
                        title={t(l.locked ? "Unlock layer" : "Lock layer")}
                        active={l.locked}
                        onClick={() => toggleLayer(l.id, "locked")}
                      />
                    </div>
                  ))}
                </div>
                {(() => {
                  const l =
                    map.layers.find((l) => l.id === activeLayer) ||
                    map.layers[0];
                  return (
                    <div className="layer-settings">
                      <Slider
                        label={t("Opacity")}
                        value={Math.round(l.opacity * 100)}
                        onChange={(v) =>
                          mutateMap(
                            (m) =>
                              (m.layers.find((n) => n.id === l.id)!.opacity =
                                v / 100),
                            "Layer opacity",
                          )
                        }
                      />
                      <Field label={t("Blend mode")}>
                        <select
                          value={l.blend}
                          onChange={(e) =>
                            mutateMap(
                              (m) =>
                                (m.layers.find((n) => n.id === l.id)!.blend = e
                                  .target.value as GlobalCompositeOperation),
                              "Layer blend mode",
                            )
                          }
                        >
                          {[
                            ["source-over", "Normal"],
                            ["multiply", "Multiply"],
                            ["screen", "Screen"],
                            ["overlay", "Overlay"],
                          ].map(([v, n]) => (
                            <option key={v} value={v}>
                              {t(n)}
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  );
                })()}
                <div className="mask-actions">
                  <button
                    className={`button subtle ${brush.mask && brush.layer === activeLayer ? "mask-active" : ""}`}
                    onClick={() => {
                      setTool("brush");
                      setBrush((b) => ({
                        ...b,
                        layer: activeLayer,
                        mask: !b.mask || b.layer !== activeLayer,
                      }));
                    }}
                  >
                    <Paintbrush size={13} />
                    {t("Paint layer mask")}
                  </button>
                  <button
                    className="button subtle"
                    title={t("Clear mask")}
                    onClick={() =>
                      mutateMap((m) => {
                        delete m.layers.find((l) => l.id === activeLayer)!.mask;
                      }, "Clear layer mask")
                    }
                  >
                    <RotateCcw size={13} />
                  </button>
                </div>
                <button
                  className="button subtle full"
                  onClick={() => {
                    const id = uid();
                    mutateMap(
                      (m) =>
                        m.layers.push({
                          id,
                          name: `Layer ${m.layers.length - 6}`,
                          visible: true,
                          locked: false,
                          opacity: 1,
                          blend: "source-over",
                        }),
                      "Add layer",
                    );
                    setActiveLayer(id);
                    setBrush((b) => ({ ...b, layer: id }));
                  }}
                >
                  <Plus size={15} />
                  {t("Add layer")}
                </button>
                <label className="checkbox player-toggle">
                  <input
                    type="checkbox"
                    checked={player}
                    onChange={(e) => setPlayer(e.target.checked)}
                  />
                  {t("Player view")}
                </label>
                <div className="panel-heading texture-heading">
                  <span className="section-kicker">{t("Texture layers")}</span>
                </div>
                <div className="layers-list">
                  {[...textures].reverse().map((l) => (
                    <div
                      className={`layer-row ${activeTexture === l.id ? "selected" : ""} ${dragTexture && dragTexture !== l.id ? "drop-target" : ""}`}
                      key={l.id}
                      draggable
                      onDragStart={(e) => {
                        setDragTexture(l.id);
                        e.dataTransfer.effectAllowed = "move";
                      }}
                      onDragEnd={() => setDragTexture(null)}
                      onDragOver={(e) => {
                        if (dragTexture) e.preventDefault();
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const id = dragTexture;
                        setDragTexture(null);
                        if (id && id !== l.id)
                          changeTextures(
                            (list) => placeLayer(list, id, l.id, []),
                            "Reorder texture layers",
                          );
                      }}
                    >
                      <IconButton
                        icon={l.visible ? Eye : EyeOff}
                        title={t(
                          l.visible ? "Hide texture" : "Show texture",
                        )}
                        active={!l.visible}
                        onClick={() =>
                          changeTextures((list) => {
                            const n = list.find((n) => n.id === l.id)!;
                            n.visible = !n.visible;
                          }, "Texture visibility")
                        }
                      />
                      <button
                        className="layer-name"
                        onClick={() => setActiveTexture(l.id)}
                      >
                        <img
                          className="layer-thumbnail texture-thumbnail"
                          alt=""
                          src={texturePreview(l, map.settings.style)}
                        />
                        <span>{t(l.name)}</span>
                      </button>
                      <span className="layer-order">
                        <IconButton
                          icon={ChevronUp}
                          title={t("Move layer up")}
                          onClick={() =>
                            changeTextures(
                              (list) => moveLayer(list, l.id, 1, []),
                              "Reorder texture layers",
                            )
                          }
                        />
                        <IconButton
                          icon={ChevronDown}
                          title={t("Move layer down")}
                          onClick={() =>
                            changeTextures(
                              (list) => moveLayer(list, l.id, -1, []),
                              "Reorder texture layers",
                            )
                          }
                        />
                      </span>
                    </div>
                  ))}
                </div>
                {(() => {
                  const l =
                    textures.find((l) => l.id === activeTexture) ||
                    textures[0];
                  const edit = (change: (n: TextureLayer) => void, label: string) =>
                    changeTextures(
                      (list) => change(list.find((n) => n.id === l.id)!),
                      label,
                    );
                  const custom = !BUILTIN_MATERIALS.includes(l.id);
                  return (
                    <div className="layer-settings texture-settings">
                      <Field label={t("Name")}>
                        <input
                          value={l.name}
                          onChange={(e) =>
                            edit((n) => (n.name = e.target.value), "Rename texture")
                          }
                        />
                      </Field>
                      <Field label={t("Pattern")}>
                        <select
                          value={l.pattern}
                          disabled={!!l.image}
                          onChange={(e) =>
                            edit(
                              (n) =>
                                (n.pattern = e.target.value as TextureLayer["pattern"]),
                              "Texture pattern",
                            )
                          }
                        >
                          {PATTERNS.map((p) => (
                            <option key={p} value={p}>
                              {t(p[0].toUpperCase() + p.slice(1))}
                            </option>
                          ))}
                        </select>
                      </Field>
                      <div className="texture-actions">
                        <button
                          className="button subtle"
                          onClick={() => textureInput.current?.click()}
                        >
                          <ImagePlus size={13} />
                          {t(l.image ? "Replace image" : "Use an image")}
                        </button>
                        {l.image && (
                          <button
                            className="button subtle"
                            onClick={() =>
                              edit((n) => delete n.image, "Remove texture image")
                            }
                          >
                            <X size={13} />
                            {t("Remove image")}
                          </button>
                        )}
                      </div>
                      <Field label={t("Colour")}>
                        <div className="texture-tint">
                          <input
                            type="color"
                            aria-label={t("Colour")}
                            disabled={!!l.image}
                            value={textureColour(l, map.settings.style)}
                            onChange={(e) =>
                              edit((n) => (n.tint = e.target.value), "Texture colour")
                            }
                          />
                          <button
                            className="button subtle"
                            disabled={!l.tint || !!l.image}
                            onClick={() => edit((n) => delete n.tint, "Texture colour")}
                          >
                            {t("Map style colour")}
                          </button>
                        </div>
                      </Field>
                      <Slider
                        label={t("Tile size")}
                        value={l.scale}
                        min={25}
                        max={400}
                        suffix="%"
                        onChange={(v) => edit((n) => (n.scale = v), "Texture size")}
                      />
                      <Slider
                        label={t("Pattern strength")}
                        value={l.strength}
                        min={0}
                        onChange={(v) =>
                          edit((n) => (n.strength = v), "Texture strength")
                        }
                      />
                      <Field label={t("Repetition")}>
                        <select
                          value={l.tiling ?? "blended"}
                          onChange={(e) => {
                            const tiling = e.target.value as TextureTiling;
                            if (tiling === "unveil" && !l.cover)
                              coverInput.current?.click();
                            else
                              edit(
                                (n) => (n.tiling = tiling),
                                "Texture repetition",
                              );
                          }}
                        >
                          <option value="blended">
                            {t("Blended (no visible repeats)")}
                          </option>
                          <option value="tiled">
                            {t("Tiled (repeats exactly)")}
                          </option>
                          <option value="unveil">
                            {t("Unveil a map-wide image")}
                          </option>
                        </select>
                      </Field>
                      {(l.tiling === "unveil" || l.cover) && (
                        <div className="texture-actions">
                          <button
                            className="button subtle"
                            onClick={() => coverInput.current?.click()}
                          >
                            <ImagePlus size={13} />
                            {t(l.cover ? "Replace map image" : "Upload map image")}
                          </button>
                          {l.cover && (
                            <button
                              className="button subtle"
                              onClick={() =>
                                edit((n) => {
                                  delete n.cover;
                                  if (n.tiling === "unveil") n.tiling = "blended";
                                }, "Remove texture map image")
                              }
                            >
                              <X size={13} />
                              {t("Remove map image")}
                            </button>
                          )}
                        </div>
                      )}

                      {custom && (
                        <div className="texture-delete">
                          <Field label={t("Replace painted ground with")}>
                            <select
                              value={replaceWith}
                              onChange={(e) => setReplaceWith(e.target.value)}
                            >
                              <option value="">{t("Auto")}</option>
                              {textures
                                .filter((o) => o.id !== l.id && !o.id.endsWith("water"))
                                .map((o) => (
                                  <option key={o.id} value={o.id}>
                                    {t(o.name)}
                                  </option>
                                ))}
                            </select>
                          </Field>
                          <button
                            className="button subtle full"
                            onClick={() => deleteTexture(l.id, replaceWith || null)}
                          >
                            <Trash2 size={13} />
                            {t("Delete texture layer")}
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })()}
                <button className="button subtle full" onClick={addTexture}>
                  <Plus size={15} />
                  {t("Add texture layer")}
                </button>
              </>
            )}
            {panel === "library" && (
              <>
                <div className="panel-heading">
                  <span className="section-kicker">{t("Library")}</span>
                </div>
                <div className="segmented">
                  {["Built-in", "Search web", "My stamps"].map((v) => (
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
                        <option value="cartography">
                          Kenney Cartography · 83
                        </option>
                        <option value="medieval">
                          Kenney Medieval RTS · 126
                        </option>
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
                      {[...kenney]
                        // Map symbols first; arrows, path pieces and textures last.
                        .sort(
                          (x, y) =>
                            Number(/arrow|path|texture|element/i.test(x.name)) -
                            Number(/arrow|path|texture|element/i.test(y.name)),
                        )
                        .filter(
                          (a) =>
                            a.pack === assetPack &&
                            a.name
                              .toLowerCase()
                              .includes(assetSearch.toLowerCase()),
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
                                sprite: { src: a.src, name: a.name },
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
                      Kenney · CC0 1.0
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
                            src={`/api/image?${new URLSearchParams({ url: asset.thumbnail })}`}
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
                        <p>
                          {t("No results")}
                        </p>
                      </div>
                    )}
                  </>
                )}
                {libraryTab === "My stamps" && (
                  <>
                    <button
                      className="button subtle full"
                      onClick={() => imageInput.current?.click()}
                    >
                      <ImagePlus size={16} />
                      {t("Import image")}
                    </button>
                    <div className="stamp-grid my-stamps">
                      {myStamps.map((s) => (
                        <button key={s.id} onClick={() => dropMyStamp(s)}>
                          <img src={s.image} alt="" />
                          <span>{s.name}</span>
                        </button>
                      ))}
                    </div>
                    {myStamps.length === 0 && (
                      <div className="empty-state">
                        <ImagePlus size={28} />
                        <p>
                          {t("No stamps yet")}
                        </p>
                      </div>
                    )}
                  </>
                )}
                <button
                  className="credits-link"
                  onClick={() => setModal("credits")}
                >
                  <BookOpen size={14} />
                  {t("Credits")}
                  <ExternalLink size={12} />
                </button>
              </>
            )}
            {panel === "history" && (
              <>
                <div className="panel-heading">
                  <span className="section-kicker">{t("History")}</span>
                </div>
                <div className="snapshot-form">
                  <input
                    placeholder={t("Snapshot")}
                    value={snapshotName}
                    onChange={(e) => setSnapshotName(e.target.value)}
                  />
                  <IconButton
                    icon={Camera}
                    title={t("Create snapshot")}
                    onClick={takeSnapshot}
                  />
                </div>
                <h3 className="section-kicker">{t("Named snapshots")}</h3>
                {snapshots.length === 0 && (
                  <p className="panel-footnote">{t("No snapshots yet.")}</p>
                )}
                {snapshots.map((s) => (
                  <div className="snapshot-row" key={s.id}>
                    <Camera size={14} />
                    <span>{s.name}</span>
                    <button
                      onClick={() => {
                        commit(structuredClone(s.project), "Restore snapshot");
                        setSelected([]);
                      }}
                    >
                      {t("Restore")}
                    </button>
                  </div>
                ))}
                <h3 className="section-kicker history-title">
                  {t("Project history")}
                </h3>
                <div className="history-list">
                  {history
                    .map((entry, i) => (
                      <button
                        key={i}
                        className={`${i === historyIndex ? "current" : ""} ${i > historyIndex ? "future" : ""}`}
                        onClick={() => {
                          setProject(entry.project);
                          setHistoryIndex(i);
                          setSelected([]);
                        }}
                      >
                        <span className="history-node" />
                        {t(entry.label)}
                        {i === historyIndex && <Check size={13} />}
                      </button>
                    ))
                    .reverse()}
                </div>
              </>
            )}
            {panel === "tools" && (
              <>
                <div className="panel-heading">
                  <span className="section-kicker">{t("More tools")}</span>
                </div>
                <div className="all-tools">
                  {Object.entries(toolInfo).map(
                    ([key, [name, Icon, shortcut]]) => (
                      <button
                        key={key}
                        className={tool === key ? "active" : ""}
                        onClick={() => chooseTool(key as Tool)}
                      >
                        <Icon size={17} />
                        {t(name)}
                        <kbd>{shortcut}</kbd>
                      </button>
                    ),
                  )}
                </div>
              </>
            )}
            {panel === "rooms" && (
              <>
                <div className="panel-heading">
                  <span className="section-kicker">{t("Room key")}</span>
                  <h2>{map.name}</h2>
                  <p>
                    {map.rooms.length} {lang === "ru" ? "комнат" : "rooms"} ·{" "}
                    {t("Level")} {map.settings.level} · {map.settings.party}{" "}
                    {lang === "ru" ? "игроков" : "adventurers"}
                  </p>
                </div>
                {map.rooms.map((room) => (
                  <button
                    className={`room-row ${roomDetail === room.id ? "active" : ""}`}
                    key={room.id}
                    onClick={() => setRoomDetail(room.id)}
                  >
                    <span>{room.number}</span>
                    <div>
                      <b>{room.type}</b>
                      <small>
                        {SRD.find(
                          (e) => e.key === room.monster || e.key === room.item,
                        )?.name || room.description.slice(0, 50)}
                      </small>
                    </div>
                    <ChevronRight size={14} />
                  </button>
                ))}
                {currentRoom && (
                  <div className="room-detail">
                    <div className="section-kicker">
                      {t("Room")} {currentRoom.number}
                    </div>
                    <Field label={t("Description")}>
                      <textarea
                        rows={4}
                        value={currentRoom.description}
                        onChange={(e) =>
                          mutateMap(
                            (m) =>
                              (m.rooms.find(
                                (r) => r.id === currentRoom.id,
                              )!.description = e.target.value),
                            "Edit room description",
                          )
                        }
                      />
                    </Field>
                    {[currentRoom.monster, currentRoom.item]
                      .filter(Boolean)
                      .map((key) => {
                        const e = SRD.find((e) => e.key === key);
                        return e ? (
                          <button
                            className="srd-link"
                            key={key}
                            onClick={() => setSrdDetail(e)}
                          >
                            <BookOpen size={15} />
                            {e.name}
                            <ChevronRight size={14} />
                          </button>
                        ) : null;
                      })}
                    <button
                      className="button subtle full"
                      onClick={() => {
                        mutateMap((m) => {
                          const room = m.rooms.find(
                            (r) => r.id === currentRoom.id,
                          )!;
                          const cell = m.width / m.cols,
                            ch = m.height / m.rows;
                          for (
                            let y = Math.floor(room.y / ch);
                            y < Math.ceil((room.y + room.h) / ch);
                            y++
                          )
                            for (
                              let x = Math.floor(room.x / cell);
                              x < Math.ceil((room.x + room.w) / cell);
                              x++
                            ) {
                              if (
                                !m.rooms.some(
                                  (r) =>
                                    r.id !== room.id &&
                                    x * cell >= r.x &&
                                    x * cell < r.x + r.w &&
                                    y * ch >= r.y &&
                                    y * ch < r.y + r.h,
                                )
                              )
                                m.heights[y * m.cols + x] = 0;
                            }
                          m.rooms = m.rooms.filter((r) => r.id !== room.id);
                          m.rooms.forEach((r, i) => (r.number = i + 1));
                        }, "Delete room");
                        setRoomDetail(null);
                      }}
                    >
                      <Trash2 size={13} />
                      {t("Delete room")}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </aside>
      </main>
      <footer className="statusbar wood">
        <div>
          <span className="status-tool">{t(toolInfo[tool][0])}</span>
        </div>
        <div className="cursor-status">
          <CursorReadout world={map.kind === "world"} />
          <span className="status-separator" />
          {map.kind === "dungeon" ? (
            <span>
              {map.width} × {map.height}
            </span>
          ) : (
            <button
              className="status-size"
              title={t("Resize map")}
              onClick={openResize}
            >
              {map.width} × {map.height}
            </button>
          )}
        </div>
        <button
          title={`${t("Hide panels")} · Tab`}
          onClick={() => setHidePanels((v) => !v)}
        >
          <Expand size={12} />
          <kbd>Tab</kbd>
        </button>
      </footer>
      {saveError && (
        <div className="save-error">
          {saveError}
          <button onClick={saveProjectFile}>{t("Save project")}</button>
          <button
            onClick={() =>
              void saveProject(project)
                .then(() => setSaveError(""))
                .catch(() => notify(saveError))
            }
          >
            {t("Retry saving")}
          </button>
        </div>
      )}
      {toast && (
        <div role="status" className="toast wood">
          <Check size={15} />
          {toast}
          <button onClick={() => setToast("")}>
            <X size={13} />
          </button>
        </div>
      )}
      <input
        ref={fileInput}
        className="hidden-input"
        type="file"
        accept=".atlasforge,.json"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void openProjectFile(f);
          e.target.value = "";
        }}
      />
      <input
        ref={imageInput}
        className="hidden-input"
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void importLocal(f);
          e.target.value = "";
        }}
      />
      {modal && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <section
            className={`modal wood ${modal === "fit" ? "fit-modal" : ""}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            <button
              className="modal-close icon-button"
              aria-label={t("Close")}
              onClick={() => setModal(null)}
            >
              <X size={19} />
            </button>
            <span className="section-kicker">
              ATLASFORGE /{" "}
              {t(
                modal === "new"
                  ? "New adventure"
                  : modal === "export"
                    ? "Export"
                    : modal === "credits"
                      ? "Credits"
                      : modal === "help"
                        ? "Keyboard shortcuts"
                        : modal === "resize"
                          ? "Map size"
                          : "Library",
              )}
            </span>
            <h2 id="modal-title">
              {t(
                modal === "new"
                  ? "New map"
                  : modal === "export"
                    ? "Export map"
                    : modal === "credits"
                      ? "Credits"
                      : modal === "help"
                        ? "Keyboard shortcuts"
                        : modal === "resize"
                          ? "Resize map"
                          : "Make it fit",
              )}
            </h2>
            {modal === "new" && (
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
                    placeholder={
                      lang === "ru" ? "Случайный сид" : "Random seed"
                    }
                    value={newSeed}
                    onChange={(e) => setNewSeed(e.target.value)}
                  />
                </Field>
                {newKind !== "dungeon" && (
                  <MapSizeFields
                    t={t}
                    size={newSize}
                    onChange={setNewSize}
                  />
                )}
                <button
                  disabled={busy}
                  className="button brass full"
                  onClick={() =>
                    createMap(newKind, newName, newSeed, undefined, newSize)
                  }
                >
                  {busy ? (
                    <LoaderCircle className="spin" size={16} />
                  ) : (
                    <Plus size={16} />
                  )}{" "}
                  {t("Create map")}
                </button>
              </>
            )}
            {modal === "resize" && (
              <>
                <MapSizeFields
                  t={t}
                  size={resize}
                  onChange={(s) => setResize({ ...resize, ...s })}
                />
                <Field label={t("Keep the map at")}>
                  <div className="anchor-grid" role="radiogroup">
                    {([0, 0.5, 1] as const).flatMap((y) =>
                      ([0, 0.5, 1] as const).map((x) => (
                        <button
                          key={`${x}-${y}`}
                          role="radio"
                          aria-checked={
                            resize.anchor.x === x && resize.anchor.y === y
                          }
                          aria-label={`${t(y === 0 ? "Top" : y === 1 ? "Bottom" : "Middle")} ${t(x === 0 ? "left" : x === 1 ? "right" : "centre")}`}
                          className={
                            resize.anchor.x === x && resize.anchor.y === y
                              ? "active"
                              : ""
                          }
                          onClick={() =>
                            setResize({ ...resize, anchor: { x, y } })
                          }
                        />
                      )),
                    )}
                  </div>
                </Field>
                <button className="button brass full" onClick={applyResize}>
                  <Maximize2 size={16} /> {t("Resize map")}
                </button>
              </>
            )}
            {modal === "export" && (
              <>
                <Field label={t("Format")}>
                  <select
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value)}
                  >
                    <option value="png">PNG image</option>
                    <option value="pdf">
                      PDF {map.kind === "dungeon" ? "+ room key" : ""}
                    </option>
                    <option value="vtt">Universal VTT (.dd2vtt)</option>
                    <option value="project">
                      {t("Project file")} (.atlasforge)
                    </option>
                  </select>
                </Field>
                {exportFormat !== "project" && (
                  <>
                    <Field label={t("Resolution")}>
                      <select
                        value={exportScale}
                        onChange={(e) => setExportScale(+e.target.value)}
                      >
                        {[1, 2, 3]
                          // Browsers refuse canvases much past ~120 million pixels.
                          .filter(
                            (s) =>
                              s === 1 ||
                              map.width * map.height * s * s <= 120_000_000,
                          )
                          .map((s) => (
                            <option key={s} value={s}>
                              {s}× · {map.width * s} × {map.height * s}
                            </option>
                          ))}
                      </select>
                    </Field>
                    <label className="checkbox">
                      <input
                        type="checkbox"
                        checked={exportSecrets}
                        onChange={(e) => setExportSecrets(e.target.checked)}
                      />
                      {t("Include GM secrets")}
                    </label>
                    <p className="panel-footnote">
                      ZIP ·{" "}
                      {exportSecrets ? t("GM view") : t("Player view")}
                    </p>
                  </>
                )}
                <button
                  className="button brass full"
                  disabled={busy}
                  onClick={async () => {
                    if (exportFormat === "project") {
                      saveProjectFile();
                      setModal(null);
                      return;
                    }
                    setBusy(true);
                    try {
                      await exportMap(
                        project,
                        map,
                        editor.current!.exportCanvas(
                          !exportSecrets,
                          exportScale,
                        ),
                        exportFormat,
                        !exportSecrets,
                      );
                      setModal(null);
                      notify(
                        lang === "ru"
                          ? "Карта экспортирована."
                          : "Map exported.",
                      );
                    } catch (e) {
                      notify(String(e));
                    } finally {
                      setBusy(false);
                    }
                  }}
                >
                  <Download size={16} />
                  {t("Download")}
                </button>
              </>
            )}
            {modal === "credits" && (
              <>
                <label className="checkbox">
                  <input
                    type="checkbox"
                    checked={project.commercial}
                    onChange={(e) =>
                      commit(
                        { ...project, commercial: e.target.checked },
                        "Change commercial usage",
                      )
                    }
                  />
                  {t("Commercial project")}
                </label>
                <div className="credits-list">
                  <article>
                    <h3>System Reference Document 5.2</h3>
                    <span className="licence-tag">CC BY 4.0</span>
                    <p>
                      Wizards of the Coast LLC · 331 creatures, 760 magic items.
                      Imported via Open5e, adapted for room generation.
                    </p>
                    <a
                      href="https://www.dndbeyond.com/srd"
                      target="_blank"
                      rel="noreferrer"
                    >
                      SRD 5.2 <ExternalLink size={11} />
                    </a>
                    <p>
                      This work includes material from the System Reference
                      Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC,
                      available at www.dndbeyond.com/srd. The SRD 5.2 is
                      licensed under the Creative Commons Attribution 4.0
                      International License available at{" "}
                      <a
                        href="https://creativecommons.org/licenses/by/4.0/legalcode"
                        target="_blank"
                        rel="noreferrer"
                      >
                        creativecommons.org/licenses/by/4.0/legalcode
                      </a>
                      .
                    </p>
                  </article>
                  {project.credits.map((c) => (
                    <article key={c.id}>
                      <h3>{c.name}</h3>
                      <span
                        className={`licence-tag ${project.commercial && /\bNC\b/i.test(c.license) ? "warning" : ""}`}
                      >
                        {c.license}
                      </span>
                      {project.commercial && /\bNC\b/i.test(c.license) && (
                        <p className="error-message">
                          {t("Non-commercial asset")}
                        </p>
                      )}
                      <p>{c.author}</p>
                      {c.url && (
                        <a
                          href={/^https?:\/\//.test(c.url) ? c.url : undefined}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t("Source link")} <ExternalLink size={11} />
                        </a>
                      )}
                    </article>
                  ))}
                </div>
                <button
                  className="button subtle full"
                  onClick={() =>
                    download(
                      new Blob([creditsText(project)], { type: "text/plain" }),
                      "CREDITS.txt",
                    )
                  }
                >
                  <Download size={14} />
                  {t("Credits")}
                </button>
              </>
            )}
            {modal === "help" && (
              <>
                <div className="shortcut-list">
                  {[
                    ["V / H", "Select / Pan"],
                    ["B / E", "Brush / Eraser"],
                    ["A / Q", "Raise terrain / Dig terrain"],
                    ["R / F / Y", "Smooth / Flatten / Roughen"],
                    ["M / W / Z", "Mountain range / River / Island"],
                    ["L / U / O", "Line / Rectangle / Ellipse"],
                    ["S / T", "Place stamp / Text"],
                    ["[ / ]", "Brush size"],
                    ["X / D", "Swap / reset colours"],
                    ["Space + drag", "Pan"],
                    ["Scroll", "Zoom"],
                    ["0", "Fit map"],
                    ["Enter", "Generate a new map"],
                    ["Ctrl Z", "Undo"],
                    ["Ctrl Shift Z", "Redo"],
                    ["Ctrl G", "Group"],
                    ["Ctrl D", "Duplicate"],
                    ["Ctrl S", "Save project"],
                    ["Tab", "Hide panels"],
                  ].map(([key, name]) => (
                    <div key={key}>
                      <span>{t(name)}</span>
                      <kbd>{key}</kbd>
                    </div>
                  ))}
                </div>
                <p className="panel-footnote">
                  {t("Double-click a settlement to explore it.")} Shift:
                  multi-select / keep aspect ratio. Alt: pick colour / scale
                  from centre.
                </p>
              </>
            )}
            {modal === "fit" && (
              <>
                <div className="fit-preview">
                  {fitBusy ? (
                    <LoaderCircle size={25} className="spin" />
                  ) : (
                    fitPreview && (
                      <img src={fitPreview.data} alt={t("Preview")} />
                    )
                  )}
                </div>
                <div className="fit-options">
                  {(
                    [
                      ["removeBackground", "Remove background"],
                      ["trim", "Trim empty space"],
                      ["parchment", "Parchment colours"],
                      ["outline", "Ink outline"],
                      ["shadow", "Drop shadow"],
                      ["posterize", "Posterize"],
                    ] as [keyof FitSettings, string][]
                  ).map(([key, label]) => (
                    <label className="checkbox" key={key}>
                      <input
                        type="checkbox"
                        checked={!!fitSettings[key]}
                        onChange={(e) =>
                          setFitSettings((s) => ({
                            ...s,
                            [key]: e.target.checked,
                          }))
                        }
                      />
                      {t(label)}
                    </label>
                  ))}
                </div>
                {fitSettings.removeBackground && (
                  <Slider
                    label={t("Tolerance")}
                    value={fitSettings.tolerance}
                    onChange={(v) =>
                      setFitSettings((s) => ({ ...s, tolerance: v }))
                    }
                    min={1}
                    max={60}
                  />
                )}
                <Field label={t("Name")}>
                  <input
                    value={fitCredit.name}
                    onChange={(e) =>
                      setFitCredit((c) => ({ ...c, name: e.target.value }))
                    }
                  />
                </Field>
                <div className="credit-fields">
                  <Field label={t("Author")}>
                    <input
                      value={fitCredit.author}
                      onChange={(e) =>
                        setFitCredit((c) => ({ ...c, author: e.target.value }))
                      }
                    />
                  </Field>
                  <Field label={t("Licence")}>
                    <input
                      value={fitCredit.license}
                      onChange={(e) =>
                        setFitCredit((c) => ({ ...c, license: e.target.value }))
                      }
                    />
                  </Field>
                </div>
                <Field label={t("Source link")}>
                  <input
                    value={fitCredit.url}
                    onChange={(e) =>
                      setFitCredit((c) => ({ ...c, url: e.target.value }))
                    }
                  />
                </Field>
                <button
                  className="button brass full"
                  disabled={!fitPreview || fitBusy}
                  onClick={addStamp}
                >
                  <Plus size={15} />
                  {t("Add to library")}
                </button>
              </>
            )}
          </section>
        </div>
      )}
      {srdDetail && (
        <div
          className="modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setSrdDetail(null);
          }}
        >
          <section
            className="modal stat-block wood"
            role="dialog"
            aria-modal="true"
            aria-label={srdDetail.name}
          >
            <button
              className="modal-close icon-button"
              onClick={() => setSrdDetail(null)}
            >
              <X size={18} />
            </button>
            <span className="section-kicker">SRD 5.2 · CC BY 4.0</span>
            <h2>{srdDetail.name}</h2>
            {srdDetail.kind === "monster" && (
              <div className="stat-numbers">
                <span>
                  CR <b>{srdDetail.cr}</b>
                </span>
                <span>
                  AC <b>{srdDetail.ac}</b>
                </span>
                <span>
                  HP <b>{srdDetail.hp}</b>
                </span>
                <span>
                  XP <b>{srdDetail.xp}</b>
                </span>
              </div>
            )}
            {srdDetail.rarity && (
              <span className="licence-tag">{srdDetail.rarity}</span>
            )}
            <p>{srdDetail.description}</p>
            <div className="stat-description">
              {srdDetail.details?.split("\n\n").map((p, i) => (
                <p key={i}>{p}</p>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
