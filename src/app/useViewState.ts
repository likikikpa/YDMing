import { useEffect, useState } from "react";
import type { SrdEntry } from "../types";
import { translate } from "../i18n";
import { readSetting } from "../legacy-keys";
import type { ModalName, Panel } from "./constants";

/** Which panel, dialog and menu are open, and the view switches. */
export function useViewState() {
  const [lang, setLang] = useState(() => readSetting("ydming-lang") || "en");
  const [panel, setPanel] = useState<Panel>("generate");
  const [selected, setSelected] = useState<string[]>([]);
  const [toolCardOpen, setToolCardOpen] = useState(() => {
    try {
      return readSetting("ydming-tool-card") !== "closed";
    } catch {
      return true;
    }
  });
  const [contours, setContours] = useState(false);
  const [player, setPlayer] = useState(false);
  const [hidePanels, setHidePanels] = useState(false);
  // On a phone the side panel is a sheet that slides up over the map.
  const [sheet, setSheet] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState<ModalName | null>(null);
  const [menu, setMenu] = useState(false);
  const [group, setGroup] = useState("Shape");
  const [more, setMore] = useState(false);
  const [srdDetail, setSrdDetail] = useState<SrdEntry | null>(null);
  const [roomDetail, setRoomDetail] = useState<string | null>(null);
  // Points placed so far for a river that has not been approved yet.
  const [riverCount, setRiverCount] = useState(0);
  const t = (s: string) => translate(lang, s);
  useEffect(() => {
    localStorage.setItem("ydming-lang", lang);
    document.documentElement.lang = lang;
  }, [lang]);
  return {
    lang,
    setLang,
    t,
    panel,
    setPanel,
    selected,
    setSelected,
    toolCardOpen,
    setToolCardOpen,
    contours,
    setContours,
    player,
    setPlayer,
    hidePanels,
    setHidePanels,
    sheet,
    setSheet,
    busy,
    setBusy,
    modal,
    setModal,
    menu,
    setMenu,
    group,
    setGroup,
    more,
    setMore,
    srdDetail,
    setSrdDetail,
    roomDetail,
    setRoomDetail,
    riverCount,
    setRiverCount,
  };
}
