import { unzipSync } from "fflate";

/** Pictures taken from a stamp pack, named after their files. */
export interface PackImage {
  name: string;
  blob: Blob;
}

const MAX_IMAGES = 300;
const MAX_IMAGE_BYTES = 10_000_000;
const MAX_TOTAL_BYTES = 150_000_000;
const TYPES: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
};
const extension = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
/** "oak_tree-03.png" → "oak tree 03". */
const stampName = (path: string) =>
  (path.split("/").pop() ?? path)
    .replace(/\.[^.]+$/, "")
    .replace(/[_-]+/g, " ")
    .trim() || "Stamp";

/**
 * The pictures in what the GM picked: image files as they are, and the PNG,
 * JPEG and WebP files inside any ZIP. Folders, hidden files and macOS
 * metadata are skipped. A pack that is too big stops with a message that says
 * what to do.
 */
export async function packImages(files: File[]): Promise<PackImage[]> {
  const found: PackImage[] = [];
  let total = 0;
  const add = (name: string, bytes: BlobPart, size: number, type: string) => {
    if (size > MAX_IMAGE_BYTES) return;
    total += size;
    if (found.length >= MAX_IMAGES || total > MAX_TOTAL_BYTES)
      throw new Error(
        `A pack can hold up to ${MAX_IMAGES} images (${MAX_TOTAL_BYTES / 1_000_000} MB). Split it into smaller packs.`,
      );
    found.push({ name: stampName(name), blob: new Blob([bytes], { type }) });
  };
  for (const file of files) {
    const ext = extension(file.name);
    if (ext === "zip") {
      let entries: Record<string, Uint8Array>;
      try {
        entries = unzipSync(new Uint8Array(await file.arrayBuffer()), {
          filter: (entry) =>
            entry.originalSize <= MAX_IMAGE_BYTES &&
            !!TYPES[extension(entry.name)] &&
            !entry.name.startsWith("__MACOSX/") &&
            !(entry.name.split("/").pop() ?? "").startsWith("."),
        });
      } catch {
        throw new Error(`${file.name} is not a ZIP file that can be opened.`);
      }
      for (const [name, data] of Object.entries(entries).sort(([a], [b]) =>
        a.localeCompare(b),
      ))
        add(name, data as BlobPart, data.length, TYPES[extension(name)]);
    } else if (TYPES[ext])
      add(file.name, file, file.size, file.type || TYPES[ext]);
  }
  return found;
}
