import { useEffect, useState } from "react";

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
export function TooltipLayer() {
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
