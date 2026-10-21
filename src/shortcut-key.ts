/**
 * The letter a key press stands for, whatever the keyboard layout. On a
 * Russian layout Ctrl+C reports the key "с" (Cyrillic), so comparing it with
 * "c" never matched and Ctrl+C, Ctrl+V and Ctrl+Z did nothing. A Latin letter
 * is used as typed (Dvorak keeps its own letters); any other character falls
 * back to the physical key ("KeyC").
 */
export function shortcutKey(e: Pick<KeyboardEvent, "key" | "code">): string {
  if (/^[a-z]$/i.test(e.key)) return e.key.toLowerCase();
  const physical = /^Key([A-Z])$/.exec(e.code);
  if (physical) return physical[1].toLowerCase();
  // The bracket keys carry other letters on Russian layouts.
  if (e.code === "BracketLeft") return "[";
  if (e.code === "BracketRight") return "]";
  return e.key.toLowerCase();
}
