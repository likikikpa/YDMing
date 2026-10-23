"""Imports ground textures from Poly Haven (CC0, https://polyhaven.com/license).

Each texture's 1K colour map is shrunk to the 128 px tile the terrain renderer
uses and written to public/assets/textures/<key>.jpg; the list goes to
src/data/textures.json. Needs Pillow (pip install pillow). Run from the repo
root: python3 scripts/import-polyhaven.py
"""
import io
import json
import urllib.request
from pathlib import Path

from PIL import Image

# key, Poly Haven id, label, the built-in ground it stands in for
TEXTURES = [
    ("grass", "grass_ground", "Lush grass", "grass"),
    ("forest-floor", "forest_leaves_02", "Forest floor", "grass"),
    ("autumn-leaves", "leaves_forest_ground", "Autumn leaves", "grass"),
    ("dirt", "dirt_floor", "Warm dirt", "dirt"),
    ("dark-mud", "brown_mud_03", "Dark mud", "mud"),
    ("sand", "sand_01", "Dry sand", "sand"),
    ("rocky-trail", "rocky_trail", "Rocky trail", "rock"),
    ("gravel", "rock_ground", "Grey gravel", "rock"),
    ("mossy-rock", "mossy_rock", "Mossy rock", "rock"),
    ("snow", "snow_02", "Smooth snow", "snow"),
    ("rough-snow", "snow_03", "Rough snow", "snow"),
    ("cobblestone", "cobblestone_floor_03", "Cobblestone", "cobble"),
    ("mossy-cobblestone", "mossy_cobblestone", "Mossy cobblestone", "cobble"),
    ("planks", "wood_planks", "Wood planks", "dirt"),
    ("dark-planks", "dark_wooden_planks", "Dark planks", "dirt"),
    ("red-earth", "red_laterite_soil_stones", "Red earth", "dirt"),
    ("burned-ground", "burned_ground_01", "Burned ground", "mud"),
    ("cracked-mud", "mud_cracked_dry_03", "Cracked mud", "mud"),
    ("withered-grass", "withered_grass", "Withered grass", "grass"),
    ("sparse-grass", "sparse_grass", "Sparse grass", "grass"),
    ("pine-needles", "forrest_ground_03", "Pine needles", "grass"),
    ("forest-mud", "mud_forest", "Forest mud", "mud"),
    ("trampled-snow", "snow_01", "Trampled snow", "snow"),
]
TILE = 128
HEADERS = {"User-Agent": "YDMing asset import"}
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "textures"


def fetch(url: str) -> bytes:
    with urllib.request.urlopen(urllib.request.Request(url, headers=HEADERS), timeout=60) as r:
        return r.read()


OUT.mkdir(parents=True, exist_ok=True)
catalogue = json.loads(fetch("https://api.polyhaven.com/assets?t=textures"))
manifest = []
for key, asset, label, ground in TEXTURES:
    info = catalogue[asset]
    files = json.loads(fetch(f"https://api.polyhaven.com/files/{asset}"))
    image = Image.open(io.BytesIO(fetch(files["Diffuse"]["1k"]["jpg"]["url"]))).convert("RGB")
    image.resize((TILE, TILE), Image.LANCZOS).save(OUT / f"{key}.jpg", quality=90, optimize=True)
    manifest.append(
        {
            "id": f"polyhaven-{key}",
            "name": label,
            "ground": ground,
            "src": f"/assets/textures/{key}.jpg",
            "author": " & ".join(sorted(info["authors"])),
            "source": f"https://polyhaven.com/a/{asset}",
        }
    )
    print(label, "<-", asset)
(OUT / "License.txt").write_text(
    "Ground textures from Poly Haven (https://polyhaven.com), released under CC0 1.0 Universal:\n"
    "https://polyhaven.com/license\n\n"
    + "\n".join(f"{m['name']}: {m['source']} (by {m['author']})" for m in manifest)
    + "\n",
    encoding="utf-8",
)
(ROOT / "src" / "data" / "textures.json").write_text(json.dumps(manifest), encoding="utf-8")
print(len(manifest), "textures")
