"""Imports generated sprite sheets as a bundled stamp pack.

A sheet is one image of 3 columns x 2 rows of separate objects on flat magenta
(see scripts/pack-defs/brief-common.txt for the brief the sheets are made
with). The pack definition (scripts/pack-defs/<pack>.json) names every object
of every sheet and gives it a category and tags. For each object this script
cuts the magenta out (scripts/lib_cutout.py), trims it to its drawing, scales
it to 512 px on the long side and writes a WebP with a lossless alpha channel
to public/assets/<pack>/. The Library list goes to src/data/<pack>.json.

A definition with "mono": true makes every picture neutral grey, for packs
that must print without colour. Objects are found as groups of nearby pieces, not by grid cell, so one that
spills over its cell stays whole. Checks, printed as warnings: fewer objects
than the definition lists, an object touching the sheet edge (cropped), and
magenta left on an opaque pixel.

From the repo root (needs Pillow and numpy):
python3 -I scripts/import-sheets.py <pack> <folder with <sheet>.png files>
"""
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib_cutout import cut_out, magenta_score, split_objects  # noqa: E402

ROOT = Path(__file__).resolve().parent.parent
LONG_SIDE = 512


def greyscale(image: Image.Image) -> Image.Image:
    """The picture in neutral grey, alpha kept: a pack made for a black and white printer."""
    grey = image.convert("RGB").convert("L")
    return Image.merge("RGBA", (grey, grey, grey, image.getchannel("A")))


def trim(image: Image.Image) -> Image.Image | None:
    box = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        return None
    image = image.crop(box)
    pad = 4
    framed = Image.new("RGBA", (image.width + pad * 2, image.height + pad * 2))
    framed.paste(image, (pad, pad))
    scale = LONG_SIDE / max(framed.size)
    if scale < 1:
        framed = framed.resize(
            (round(framed.width * scale), round(framed.height * scale)), Image.LANCZOS
        )
    return framed


def main() -> None:
    if len(sys.argv) != 3:
        raise SystemExit(__doc__)
    pack, folder = sys.argv[1], Path(sys.argv[2])
    definition = json.loads((ROOT / "scripts" / "pack-defs" / f"{pack}.json").read_text("utf8"))
    out = ROOT / "public" / "assets" / pack
    out.mkdir(parents=True, exist_ok=True)
    manifest, warnings = [], []
    for sheet, spec in definition["sheets"].items():
        path = folder / f"{sheet}.png"
        if not path.exists():
            warnings.append(f"{sheet}: sheet file missing, skipped")
            continue
        cut = cut_out(Image.open(path))
        objects, notes = split_objects(cut, len(spec["items"]))
        warnings += [f"{sheet}: {n}" for n in notes]
        for item, cell in zip(spec["items"], objects):
            alpha = np.asarray(cell.getchannel("A"))
            ys, xs = np.nonzero(alpha > 8)
            ch, cw = alpha.shape
            if ys.min() == 0 or xs.min() == 0 or ys.max() == ch - 1 or xs.max() == cw - 1:
                warnings.append(f"{item['key']}: touches the sheet edge, may be cropped")
            rgb = np.asarray(cell.convert("RGB"))
            leftover = int(((magenta_score(rgb) > 90) & (alpha > 200)).sum())
            if leftover > 25:
                warnings.append(f"{item['key']}: {leftover} magenta pixels left in the drawing")
            if definition.get("mono"):
                cell = greyscale(cell)
            framed = trim(cell)
            framed.save(out / f"{item['key']}.webp", "WEBP", quality=90, method=6, alpha_quality=100)
            manifest.append(
                {
                    "id": f"{pack}-{item['key']}",
                    "name": item["name"],
                    "pack": pack,
                    "src": f"/assets/{pack}/{item['key']}.webp",
                    "aspect": round(framed.width / framed.height, 3),
                    "category": spec["category"],
                    "tags": item.get("tags", []),
                }
            )
    (out / "License.txt").write_text(definition["license"], encoding="utf-8")
    data = ROOT / "src" / "data" / f"{pack}.json"
    data.write_text(json.dumps(manifest, ensure_ascii=False), encoding="utf-8")
    kb = sum(p.stat().st_size for p in out.glob("*.webp")) // 1024
    print(len(manifest), "stamps,", kb, "KB")
    for w in warnings:
        print("WARNING:", w)


main()
