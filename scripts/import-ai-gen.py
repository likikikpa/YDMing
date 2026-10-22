"""Builds the AI_GEN stamp pack from the ZIP archives in data/.

The pictures were generated with an image model by the project owner (see
public/assets/ai-gen/License.txt). Each one is trimmed to its drawing, scaled
to 512 px on the long side and written as a lossy-colour WebP with a lossless
alpha channel to public/assets/ai-gen/; the list goes to src/data/ai-gen.json.

data/city-topdown-pack-4.zip is cut off after seven pictures. Its complete
entries are still read; the other five come from --extra DIR, a folder of the
originals named like the entries below (city-topdown-market-stall-1.png ...).

The archives are untrusted input: names are reduced to a base name, nothing is
extracted to disk, and sizes are capped. Needs Pillow. From the repo root:
python3 -I scripts/import-ai-gen.py [--extra DIR]
"""
import io
import json
import struct
import sys
import zipfile
import zlib
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "ai-gen"
LONG_SIDE = 512
MAX_BYTES = 40 * 1024 * 1024

# archive, member, key, label. Order is the order the Library lists them in.
WORLD = "stamp-packs-v2"
CITY = "city-topdown-pack-4"
DUNGEON = "dungeon-topdown-pack-5-fixed"
FOREST = "forest-topdown-pack-6"
PICTURES = [
    (WORLD, "3412-v2.png", "tree-oak", "Oak tree"),
    (WORLD, "3413-v2.png", "tree-oak-wide", "Wide oak tree"),
    (WORLD, "3414-v2.png", "tree-birch", "Birch tree"),
    (WORLD, "3415-v2.png", "tree-birch-tall", "Tall birch tree"),
    (WORLD, "3416-v2.png", "tree-linden", "Linden tree"),
    (WORLD, "3418-v2.png", "tree-broadleaf", "Broadleaf tree"),
    (WORLD, "3417-v2.png", "tree-willow", "Weeping willow"),
    (WORLD, "3419-v2.png", "tree-willow-bent", "Bent willow"),
    (WORLD, "3420-v2.png", "tree-spruce", "Spruce"),
    (WORLD, "3421-v2.png", "tree-spruce-wide", "Wide spruce"),
    (WORLD, "3422-v2.png", "tree-pine", "Tall pine"),
    (WORLD, "3424-v2.png", "tree-fir", "Fir"),
    (WORLD, "3425-v2.png", "tree-acacia", "Acacia tree"),
    (WORLD, "3426-v2.png", "tree-palm", "Palm tree"),
    (WORLD, "3428-v2.png", "tree-dead", "Dead tree"),
    (WORLD, "3432-v2.png", "tree-dead-old", "Old dead oak"),
    (WORLD, "3429-v2.png", "tree-snowy-pine", "Snowy pine"),
    (WORLD, "3431-v2.png", "tree-snowy-fir", "Snowy fir"),
    (WORLD, "3430-v2.png", "tree-autumn", "Autumn tree"),
    (WORLD, "3433-v2.png", "tree-autumn-oak", "Autumn oak"),
    (WORLD, "3452-v2.png", "peak-rocky", "Rocky peak"),
    (WORLD, "3453-v2.png", "range-desert", "Desert range"),
    (WORLD, "3456-v2.png", "peak-snow", "Snowy peak"),
    (WORLD, "3458-v2.png", "range-snow", "Snowy range"),
    (WORLD, "3455-v2.png", "hills", "Green hills"),
    (WORLD, "3457-v2.png", "ridge", "Green ridge"),
    (WORLD, "3459-v2.png", "mesa", "Mesa"),
    (WORLD, "3461-v2.png", "butte", "Red butte"),
    (WORLD, "3460-v2.png", "volcano", "Volcano"),
    (WORLD, "3463-v2.png", "crater", "Ash crater"),
    (WORLD, "3462-v2.png", "boulders", "Boulders"),
    (WORLD, "3464-v2.png", "rocks", "Rock cluster"),
    (CITY, "city-topdown-tree-oak.png", "city-oak", "City oak canopy"),
    (CITY, "city-topdown-tree-linden.png", "city-linden", "City linden canopy"),
    (CITY, "city-topdown-bushes.png", "city-bushes", "City bushes"),
    (CITY, "city-topdown-rocks.png", "city-rocks", "City rocks"),
    (CITY, "city-topdown-cart.png", "city-cart", "City cart"),
    (CITY, "city-topdown-barrels.png", "city-barrels", "City barrels"),
    (CITY, "city-topdown-fountain.png", "city-fountain", "City fountain"),
    (CITY, "city-topdown-market-stall-1.png", "city-stall-red", "City market stall, red"),
    (CITY, "city-topdown-market-stall-2.png", "city-stall-green", "City market stall, green"),
    (CITY, "city-topdown-roof-slate.png", "city-roof-slate", "City roof, slate"),
    (CITY, "city-topdown-roof-thatch.png", "city-roof-thatch", "City roof, thatch"),
    (CITY, "city-topdown-roof-tile.png", "city-roof-tile", "City roof, tile"),
    (DUNGEON, "dungeon-topdown-boulder-large.png", "dungeon-boulder", "Dungeon large boulder"),
    (DUNGEON, "dungeon-topdown-boulders-small.png", "dungeon-boulders", "Dungeon small boulders"),
    (DUNGEON, "dungeon-topdown-rubble-dense.png", "dungeon-rubble-dense", "Dungeon dense rubble"),
    (DUNGEON, "dungeon-topdown-rubble-sparse.png", "dungeon-rubble-sparse", "Dungeon sparse rubble"),
    (DUNGEON, "dungeon-topdown-stalagmites.png", "dungeon-stalagmites", "Dungeon stalagmites"),
    (DUNGEON, "dungeon-topdown-pillar-round.png", "dungeon-pillar", "Dungeon round pillar"),
    (DUNGEON, "dungeon-topdown-pillar-broken.png", "dungeon-pillar-broken", "Dungeon broken pillar"),
    (DUNGEON, "dungeon-topdown-crystals-quartz.png", "dungeon-quartz", "Dungeon quartz crystals"),
    (DUNGEON, "dungeon-topdown-crystals-calcite.png", "dungeon-calcite", "Dungeon calcite crystals"),
    (DUNGEON, "dungeon-topdown-fungus.png", "dungeon-fungus", "Dungeon fungus"),
    (DUNGEON, "dungeon-topdown-bone-pile.png", "dungeon-bones", "Dungeon bone pile"),
    (DUNGEON, "dungeon-topdown-collapsed-ceiling.png", "dungeon-collapse", "Dungeon collapsed ceiling"),
    (FOREST, "forest-topdown-tree-oak.png", "forest-oak", "Forest oak canopy"),
    (FOREST, "forest-topdown-tree-pine.png", "forest-pine", "Forest pine canopy"),
    (FOREST, "forest-topdown-tree-dead.png", "forest-dead", "Forest dead tree"),
    (FOREST, "forest-topdown-roots.png", "forest-roots", "Forest roots"),
    (FOREST, "forest-topdown-bush-low.png", "forest-bush", "Forest low bush"),
    (FOREST, "forest-topdown-bush-bramble.png", "forest-bramble", "Forest bramble"),
    (FOREST, "forest-topdown-moss-rock.png", "forest-moss-rock", "Forest mossy rock"),
    (FOREST, "forest-topdown-moss-rocks.png", "forest-moss-rocks", "Forest mossy rocks"),
    (FOREST, "forest-topdown-log-straight.png", "forest-log", "Forest log"),
    (FOREST, "forest-topdown-log-forked.png", "forest-log-forked", "Forest forked log"),
    (FOREST, "forest-topdown-mushrooms-cluster.png", "forest-mushrooms", "Forest mushroom cluster"),
    (FOREST, "forest-topdown-mushrooms-small.png", "forest-mushrooms-small", "Forest small mushrooms"),
]


def entries(path: Path) -> dict[str, bytes]:
    """Every complete file of a ZIP by base name, also when the ZIP is cut off."""
    data = path.read_bytes()
    found: dict[str, bytes] = {}
    try:
        with zipfile.ZipFile(io.BytesIO(data)) as z:
            for info in z.infolist():
                if info.is_dir() or info.file_size > MAX_BYTES:
                    continue
                found[Path(info.filename).name] = z.read(info)
        return found
    except zipfile.BadZipFile:
        pass
    pos = 0
    while data[pos : pos + 4] == b"PK\x03\x04":
        _, flag, method, _, _, _, csize, usize, nlen, elen = struct.unpack("<HHHHHIIIHH", data[pos + 4 : pos + 30])
        name = Path(data[pos + 30 : pos + 30 + nlen].decode("utf8", "replace")).name
        start = pos + 30 + nlen + elen
        if flag & 8 or usize > MAX_BYTES:
            break
        if method == 0:
            body, pos = data[start : start + usize], start + usize
        elif method == 8:
            inflate = zlib.decompressobj(-15)
            body = inflate.decompress(data[start:], MAX_BYTES)
            if not inflate.eof:
                break
            pos = len(data) - len(inflate.unused_data)
        else:
            break
        found[name] = body
    return found


def stamp(blob: bytes) -> Image.Image:
    image = Image.open(io.BytesIO(blob)).convert("RGBA")
    box = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        raise SystemExit("a picture is empty")
    image = image.crop(box)
    pad = 4
    framed = Image.new("RGBA", (image.width + pad * 2, image.height + pad * 2))
    framed.paste(image, (pad, pad))
    scale = LONG_SIDE / max(framed.size)
    if scale < 1:
        framed = framed.resize((round(framed.width * scale), round(framed.height * scale)), Image.LANCZOS)
    return framed


def main() -> None:
    extra = {}
    if "--extra" in sys.argv:
        folder = Path(sys.argv[sys.argv.index("--extra") + 1])
        extra = {p.name: p.read_bytes() for p in folder.glob("*.png")}
    archives = {name: entries(ROOT / "data" / f"{name}.zip") for name in {p[0] for p in PICTURES}}
    OUT.mkdir(parents=True, exist_ok=True)
    manifest, missing = [], []
    for archive, member, key, label in PICTURES:
        blob = archives[archive].get(member) or extra.get(member)
        if blob is None:
            missing.append(f"{archive}/{member}")
            continue
        framed = stamp(blob)
        framed.save(OUT / f"{key}.webp", "WEBP", quality=90, method=6, alpha_quality=100)
        manifest.append(
            {
                "id": f"ai-gen-{key}",
                "name": label,
                "pack": "ai-gen",
                "src": f"/assets/ai-gen/{key}.webp",
                "aspect": round(framed.width / framed.height, 3),
            }
        )
    if missing:
        print("missing, pass them with --extra:", *missing, sep="\n  ")
        raise SystemExit(1)
    (OUT / "License.txt").write_text(
        "AI_GEN: pictures generated with an AI image model by the YDMing project owner.\n"
        "They are not taken from a third-party pack and no third-party licence applies;\n"
        "use of them follows the terms of the tool that generated them.\n"
        "Each picture is trimmed to its drawing and scaled to 512 px.\n",
        encoding="utf-8",
    )
    (ROOT / "src" / "data" / "ai-gen.json").write_text(json.dumps(manifest), encoding="utf-8")
    print(len(manifest), "stamps,", sum(p.stat().st_size for p in OUT.glob("*.webp")) // 1024, "KB")


main()
