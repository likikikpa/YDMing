/**
 * Holds text being typed and hands it on after a pause, on `flush`, or never
 * if `cancel` is called. Typing into a field that edits the map would
 * otherwise copy, redraw and save the map for every letter.
 *
 * The function that applies the text is kept with the text, from the render
 * that was current when it was typed: a pause that ends after the selection
 * moved still edits the object that was being typed into.
 */
export function createDraft(delay: number) {
  let pending: { text: string; apply: (text: string) => void } | undefined,
    timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
  };
  const flush = () => {
    stop();
    const p = pending;
    pending = undefined;
    p?.apply(p.text);
  };
  return {
    /** Remembers `text` and applies it once `delay` ms pass with no more typing. */
    type(text: string, apply: (text: string) => void) {
      pending = { text, apply };
      stop();
      timer = setTimeout(flush, delay);
    },
    flush,
    cancel() {
      stop();
      pending = undefined;
    },
    get pending() {
      return pending !== undefined;
    },
  };
}
