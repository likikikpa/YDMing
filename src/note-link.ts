/**
 * Links from maps and stamps to notes outside the app, mostly Obsidian notes
 * ("Copy Obsidian URL" gives obsidian://open?vault=…&file=…). Only obsidian:
 * and web links are accepted, so a shared file cannot carry a javascript: link.
 */
export const isNoteUrl = (value: unknown): value is string =>
  typeof value === "string" &&
  value.length <= 2048 &&
  /^(obsidian:\/\/|https?:\/\/)[^\s]+$/i.test(value);

/** A short name for the note: the file name of an Obsidian link, else the host. */
export function noteName(url: string): string {
  try {
    const u = new URL(url);
    const file = u.searchParams.get("file") || u.searchParams.get("path");
    if (file) return file.split("/").pop()!.replace(/\.md$/i, "");
    return u.protocol === "obsidian:" ? "Obsidian" : u.host;
  } catch {
    return url;
  }
}
