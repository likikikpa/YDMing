import { zipSync, strToU8 } from "fflate";
import type { Project, MapData } from "./types";
import { SRD } from "./generator";
export function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
export const slug = (name: string) =>
  name
    .replace(/[^\p{L}\p{N} _-]/gu, "")
    .trim()
    .replace(/\s+/g, "-") || "atlasforge-map";
export function creditsText(project: Project) {
  return `ATLASFORGE — CREDITS\n\nOriginal procedural map symbols and generator artwork: Atlasforge.\n\nThis work includes material from the System Reference Document 5.2 (“SRD 5.2”) by Wizards of the Coast LLC, available at https://www.dndbeyond.com/srd. The SRD 5.2 is licensed under the Creative Commons Attribution 4.0 International License available at https://creativecommons.org/licenses/by/4.0/legalcode.\nSRD data imported via Open5e (https://open5e.com). Adapted and reformatted for room generation.\n\n${project.credits.map((c) => `${c.name}\nAuthor: ${c.author}\nLicence: ${c.license}\nSource: ${c.url}\n`).join("\n")}`;
}
export async function exportMap(
  project: Project,
  map: MapData,
  canvas: HTMLCanvasElement,
  format: string,
  player: boolean,
) {
  const name = slug(map.name),
    files: Record<string, Uint8Array> = {
      "CREDITS.txt": strToU8(creditsText(project)),
    };
  const png = new Uint8Array(
    await (
      await new Promise<Blob>((resolve, reject) =>
        canvas.toBlob(
          (b) => (b ? resolve(b) : reject(new Error("PNG export failed."))),
          "image/png",
        ),
      )
    ).arrayBuffer(),
  );
  if (format === "png") files[`${name}.png`] = png;
  if (format === "pdf") {
    const { jsPDF } = await import("jspdf");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
      compress: true,
      putOnlyUsedFonts: true,
    });
    const fontResponse = await fetch("/fonts/NotoSans-Regular.ttf");
    if (!fontResponse.ok)
      throw new Error(
        "The PDF font is unavailable. Reload the app online once.",
      );
    const fontBytes = new Uint8Array(await fontResponse.arrayBuffer());
    let binary = "";
    for (let i = 0; i < fontBytes.length; i += 16384)
      binary += String.fromCharCode(...fontBytes.subarray(i, i + 16384));
    pdf.addFileToVFS("NotoSans-Regular.ttf", btoa(binary));
    pdf.addFont("NotoSans-Regular.ttf", "NotoSans", "normal");
    pdf.setFont("NotoSans", "normal");
    pdf.addImage(canvas.toDataURL("image/png"), "PNG", 8, 8, 281, 199);
    if (!player && map.rooms.length) {
      pdf.addPage("a4", "portrait");
      let y = 18;
      pdf.setFontSize(18);
      pdf.text(`${map.name} — Room key`, 14, y);
      y += 13;
      pdf.setFontSize(10);
      for (const room of map.rooms) {
        const entity = SRD.find(
          (e) => e.key === room.monster || e.key === room.item,
        );
        const text = `${room.number}. ${room.type.toUpperCase()} — ${room.description}${entity ? `\n${entity.name}${entity.cr !== undefined ? ` (CR ${entity.cr}, AC ${entity.ac}, HP ${entity.hp}, ${entity.xp} XP)` : ""}` : ""}`;
        const lines = pdf.splitTextToSize(text, 180);
        if (y + lines.length * 5 > 278) {
          pdf.addPage();
          y = 18;
        }
        pdf.text(lines, 14, y);
        y += lines.length * 5 + 6;
      }
    }
    pdf.addPage("a4", "portrait");
    pdf.setFontSize(10);
    let y = 15;
    for (const text of creditsText(project).split("\n")) {
      const lines = pdf.splitTextToSize(text, 180);
      for (const line of lines) {
        if (y > 280) {
          pdf.addPage();
          y = 15;
        }
        pdf.text(line, 14, y);
        y += 5;
      }
    }
    files[`${name}.pdf`] = new Uint8Array(pdf.output("arraybuffer"));
  }
  if (format === "vtt") {
    const cell = map.width / map.cols,
      toPoint = (p: { x: number; y: number }) => ({
        x: p.x / cell,
        y: p.y / cell,
      }),
      walls: { x: number; y: number }[][] = [];
    if (map.kind === "dungeon") {
      for (let y = 0; y < map.rows; y++)
        for (let x = 0; x < map.cols; x++) {
          const i = y * map.cols + x;
          if (!map.heights[i]) continue;
          if (x === 0 || !map.heights[i - 1])
            walls.push([
              { x, y },
              { x, y: y + 1 },
            ]);
          if (x === map.cols - 1 || !map.heights[i + 1])
            walls.push([
              { x: x + 1, y },
              { x: x + 1, y: y + 1 },
            ]);
          if (y === 0 || !map.heights[i - map.cols])
            walls.push([
              { x, y },
              { x: x + 1, y },
            ]);
          if (y === map.rows - 1 || !map.heights[i + map.cols])
            walls.push([
              { x, y: y + 1 },
              { x: x + 1, y: y + 1 },
            ]);
        }
    }
    const rowScale = map.height / map.rows / cell;
    for (const line of walls) for (const point of line) point.y *= rowScale;
    map.paths
      .filter((p) => p.kind === "wall")
      .forEach((p) => walls.push(p.points.map(toPoint)));
    const data = {
      format: 0.3,
      resolution: {
        map_origin: { x: 0, y: 0 },
        map_size: { x: map.cols, y: map.height / cell },
        pixels_per_grid: canvas.width / map.cols,
      },
      line_of_sight: walls,
      portals: map.objects
        .filter(
          (o) =>
            (o.kind === "door" || o.kind === "secret") &&
            (!player || (o.layer !== "GM-only" && o.kind !== "secret")) &&
            map.layers.find((l) => l.id === o.layer)?.visible !== false,
        )
        .map((o) => ({
          position: toPoint(o),
          bounds: [
            toPoint({ x: o.x - o.width / 2, y: o.y }),
            toPoint({ x: o.x + o.width / 2, y: o.y }),
          ],
          rotation: o.rotation,
          closed: true,
          freestanding: false,
        })),
      environment: { baked_lighting: false, ambient_light: "ffffffff" },
      lights: [],
      image: canvas.toDataURL("image/png").split(",")[1],
    };
    files[`${name}.dd2vtt`] = strToU8(JSON.stringify(data));
  }
  const zip = zipSync(files, { level: 6 });
  download(
    new Blob([zip as BlobPart], { type: "application/zip" }),
    `${name}-${player ? "player" : "gm"}.zip`,
  );
}
