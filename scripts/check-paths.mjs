import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const errors = [];
let checked = 0;

// Check directory entries explicitly: existsSync alone accepts the wrong case
// on Windows, then the same import fails on a Linux filesystem.
function exactPath(filename) {
  const relative = path.relative(root, filename);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return false;
  let current = root;
  for (const part of relative.split(path.sep).filter(Boolean)) {
    if (!readdirSync(current).includes(part)) return false;
    current = path.join(current, part);
  }
  return true;
}

function walk(directory) {
  const files = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    if (["node_modules", "dist", "qa", "release", ".git"].includes(entry.name))
      continue;
    const filename = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walk(filename));
    else if (/\.(?:[cm]?[jt]sx?)$/.test(entry.name)) files.push(filename);
  }
  return files;
}

for (const filename of walk(root)) {
  const source = readFileSync(filename, "utf8");
  const matches = source.matchAll(
    /(?:\bfrom\s*|\bimport\s*(?:\(\s*)?|\bnew\s+URL\(\s*)["'](\.[^"'?#]+)["']/g,
  );
  for (const [, specifier] of matches) {
    checked++;
    const base = path.resolve(path.dirname(filename), specifier);
    // The build output only exists after `npm run build`, which CI runs later.
    if (path.relative(root, base).split(path.sep)[0] === "dist") continue;
    const candidates = [
      base,
      ...[".ts", ".tsx", ".js", ".mjs", ".json", ".mts", ".d.ts", ".d.mts"].map(
        (ext) => base + ext,
      ),
      ...["index.ts", "index.tsx", "index.js"].map((name) =>
        path.join(base, name),
      ),
    ];
    if (
      !candidates.some((candidate) => {
        try {
          return exactPath(candidate);
        } catch {
          return false;
        }
      })
    ) {
      errors.push(
        `${path.relative(root, filename)}: missing or incorrectly cased path ${specifier}`,
      );
    }
  }
}

const assets = JSON.parse(
  readFileSync(path.join(root, "src/data/kenney.json"), "utf8"),
);
for (const asset of [
  ...assets,
  { src: "/favicon.svg" },
  { src: "/fonts/NotoSans-Regular.ttf" },
]) {
  checked++;
  if (!exactPath(path.join(root, "public", asset.src.slice(1))))
    errors.push(`Missing or incorrectly cased public asset ${asset.src}`);
}
const launcher = readFileSync(path.join(root, "scripts/start.sh"), "utf8");
if (launcher.includes("\r"))
  errors.push("scripts/start.sh must use LF line endings for Linux.");
if (!statSync(path.join(root, "package-lock.json")).isFile())
  errors.push("Missing package-lock.json.");

if (errors.length) {
  console.error(errors.join("\n"));
  process.exitCode = 1;
} else {
  console.log(
    `Checked ${checked} import and asset paths with exact filename casing; Linux launcher uses LF.`,
  );
}
