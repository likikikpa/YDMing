"""Imports the map icons of "Fantasy Map Assets Pack Lite" by Amanz / Deface Games.

The itch.io page says CC BY 4.0 (its readme says no credit is needed), so the
app credits it either way: placing one of these stamps adds the credit to the
world. The pack is free ("pay what you want", $0 allowed); this takes the same
"No thanks, just take me to the downloads" route the page offers. Only the
512 px icons are kept (buildings, markers, mountains, trees, waves, the
compass); the 4K backgrounds, overlays and islands are left out. Each picture
is trimmed to its drawing and written to public/assets/amanz-lite/, the list to
src/data/amanz-lite.json. Needs Pillow. Run from the repo root:
python3 scripts/import-amanz.py
"""
import http.cookiejar
import io
import json
import re
import urllib.parse
import urllib.request
import zipfile
from pathlib import Path

from PIL import Image

PAGE = "https://amanz.itch.io/fantasy-map-assets-pack-lite"
# folder in the ZIP, file, key here, label
KEEP = [
    ("buildings-black", "cave solid", "cave", "Cave"),
    ("buildings-black", "home solid", "house", "House"),
    ("buildings-black", "open-city solid", "city", "City"),
    ("buildings-black", "village solid", "village", "Village"),
    ("buildings-black", "watchtower solid", "watchtower", "Watchtower"),
    ("icons-black", "battle", "battle", "Battle"),
    ("icons-black", "boss", "boss", "Boss"),
    ("icons-black", "bridge", "bridge", "Bridge"),
    ("icons-black", "chest", "chest", "Chest"),
    ("icons-black", "dungeons", "dungeon", "Dungeon entrance"),
    ("icons-black", "home", "hut", "Hut"),
    ("icons-black", "landmark", "landmark", "Landmark"),
    ("icons-black", "misc", "question", "Question mark"),
    ("icons-black", "paw", "paw", "Paw print"),
    ("icons-black", "shield", "shield", "Shield"),
    ("icons-black", "tower2", "tower", "Tower"),
    *[("mountains-black", f"mount{n}", f"mountain-{n}", f"Mountain {n}") for n in range(1, 11)],
    ("trees-black", "bush1 solid", "bush", "Bush"),
    ("trees-black", "cactus1 solid", "cactus", "Cactus"),
    ("trees-black", "pine1 solid", "pine-1", "Pine 1"),
    ("trees-black", "pine3 solid", "pine-3", "Pine 3"),
    ("trees-black", "tree1 solid", "tree-1", "Tree 1"),
    ("trees-black", "tree4 solid", "tree-4", "Tree 4"),
    ("trees-black", "tree5 solid", "tree-5", "Tree 5"),
    ("trees-black", "tree6 solid", "tree-6", "Tree 6"),
    ("trees-black", "tree7 solid", "tree-7", "Tree 7"),
    ("trees-black", "tree8 solid", "tree-8", "Tree 8"),
    ("waves-black", "waves 1", "waves-1", "Waves 1"),
    ("waves-black", "waves 2", "waves-2", "Waves 2"),
    ("waves-black", "waves 3", "waves-3", "Waves 3"),
    ("waves-black", "waves calm3", "waves-calm", "Calm waves"),
    ("misc-black", "compass", "compass", "Compass rose"),
]
LONG_SIDE = 512
ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "assets" / "amanz-lite"

jar = http.cookiejar.CookieJar()
opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(jar))
opener.addheaders = [("User-Agent", "Mozilla/5.0")]


def get(url: str) -> bytes:
    with opener.open(url, timeout=120) as r:
        return r.read()


def post(url: str, token: str) -> dict:
    body = urllib.parse.urlencode({"csrf_token": token}).encode()
    with opener.open(urllib.request.Request(url, data=body), timeout=60) as r:
        return json.load(r)


def token_of(html: bytes) -> str:
    found = re.search(rb'csrf_token" value="([^"]+)"', html)
    if not found:
        raise SystemExit("itch.io page has no download form any more")
    return found.group(1).decode()


token = token_of(get(f"{PAGE}/purchase"))
download_page = post(f"{PAGE}/download_url", token)["url"]
html = get(download_page)
upload = re.search(rb'data-upload_id="(\d+)"', html)
if not upload:
    raise SystemExit("The pack's download page lists no file")
file_url = post(f"{PAGE}/file/{upload.group(1).decode()}?source=download_page", token_of(html))["url"]
archive = zipfile.ZipFile(io.BytesIO(get(file_url)))

OUT.mkdir(parents=True, exist_ok=True)
manifest = []
for folder, name, key, label in KEEP:
    image = Image.open(io.BytesIO(archive.read(f"Assets/{folder}/{name}.png"))).convert("RGBA")
    box = image.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
    if not box:
        raise SystemExit(f"{name} is empty")
    image = image.crop(box)
    pad = 4
    framed = Image.new("RGBA", (image.width + pad * 2, image.height + pad * 2))
    framed.paste(image, (pad, pad))
    scale = LONG_SIDE / max(framed.size)
    if scale < 1:
        framed = framed.resize((round(framed.width * scale), round(framed.height * scale)), Image.LANCZOS)
    framed.save(OUT / f"{key}.png", optimize=True)
    manifest.append(
        {
            "id": f"amanz-lite-{key}",
            "name": label,
            "pack": "amanz-lite",
            "source": PAGE,
            "src": f"/assets/amanz-lite/{key}.png",
            "aspect": round(framed.width / framed.height, 3),
        }
    )
(OUT / "License.txt").write_text(
    "Fantasy Map Assets Pack Lite by Amanz (Deface Games, defacegames.com).\n"
    "The itch.io page licenses it under Creative Commons Attribution 4.0 International\n"
    "(https://creativecommons.org/licenses/by/4.0/); the pack's readme says credit is not required.\n"
    f"{PAGE}\n"
    "Only the icons are included, trimmed to their drawing.\n",
    encoding="utf-8",
)
(ROOT / "src" / "data" / "amanz-lite.json").write_text(json.dumps(manifest), encoding="utf-8")
print(len(manifest), "icons")
