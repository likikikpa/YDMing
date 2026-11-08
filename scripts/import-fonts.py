"""Fetches the bundled map fonts and writes public/fonts/*.woff2 and LICENSES.txt.

Every font comes from the Google Fonts repository (folder ofl/) under the SIL
Open Font License 1.1. A font whose licence declares a Reserved Font Name is
only converted from TrueType to WOFF2; the others are also reduced to Basic
Latin, Latin Extended and Cyrillic, which is all map names need. The list must
match BUNDLED_FONTS in src/fonts.ts. Needs fonttools and brotli:

    pip install fonttools brotli
    python3 -I scripts/import-fonts.py
"""
import io
import sys
import urllib.parse
import urllib.request
from pathlib import Path

from fontTools import subset
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "fonts"
BASE = "https://raw.githubusercontent.com/google/fonts/main/ofl/"
RANGES = "U+0020-007E,U+00A0-024F,U+0400-04FF,U+2010-2027,U+2030-203A,U+20AC,U+2116,U+2122"

# id, name, folder in the repository, file (a variable font's name has brackets), reserved name declared
FONTS = [
    ("cormorant-sc", "Cormorant SC", "cormorantsc", "CormorantSC-Regular.ttf", False),
    ("eb-garamond", "EB Garamond", "ebgaramond", "EBGaramond[wght].ttf", False),
    ("alegreya", "Alegreya", "alegreya", "Alegreya[wght].ttf", False),
    ("philosopher", "Philosopher", "philosopher", "Philosopher-Regular.ttf", False),
    ("forum", "Forum", "forum", "Forum-Regular.ttf", True),
    ("kurale", "Kurale", "kurale", "Kurale-Regular.ttf", False),
    ("marck-script", "Marck Script", "marckscript", "MarckScript-Regular.ttf", True),
    ("ruslan-display", "Ruslan Display", "ruslandisplay", "RuslanDisplay-Regular.ttf", True),
    ("cinzel", "Cinzel", "cinzel", "Cinzel[wght].ttf", False),
    ("uncial-antiqua", "Uncial Antiqua", "uncialantiqua", "UncialAntiqua-Regular.ttf", True),
    ("pirata-one", "Pirata One", "pirataone", "PirataOne-Regular.ttf", True),
]


def fetch(folder: str, name: str) -> bytes:
    url = BASE + folder + "/" + urllib.parse.quote(name)
    with urllib.request.urlopen(url, timeout=60) as response:
        return response.read()


def to_woff2(ttf: bytes, reduce: bool) -> bytes:
    # Keep the font's own modified date: saving would stamp the time of the run into each file.
    font = TTFont(io.BytesIO(ttf), recalcTimestamp=False)
    if reduce:
        options = subset.Options()
        options.layout_features = ["*"]
        options.name_IDs = ["*"]
        options.notdef_outline = True
        options.hinting = False
        subsetter = subset.Subsetter(options)
        subsetter.populate(unicodes=subset.parse_unicodes(RANGES))
        subsetter.subset(font)
    font.flavor = "woff2"
    out = io.BytesIO()
    font.save(out)
    return out.getvalue()


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    licences = [
        "Fonts that ship with YDMing (public/fonts/*.woff2).\n\n"
        "Every font below is licensed under the SIL Open Font License, Version 1.1, whose text "
        "follows each entry. The files are the fonts from the Google Fonts repository "
        "(https://github.com/google/fonts, folder ofl/) converted from TrueType to WOFF2. Where "
        "the licence declares a Reserved Font Name the font is only converted, never changed; the "
        "others are also reduced to Basic Latin, Latin Extended and Cyrillic letters and "
        "punctuation. They are not sold on their own.\n"
    ]
    for fid, name, folder, file, reserved in FONTS:
        data = to_woff2(fetch(folder, file), reduce=not reserved)
        (OUT / f"{fid}.woff2").write_bytes(data)
        licence = fetch(folder, "OFL.txt").decode("utf8").strip()
        declared = "Reserved Font Name" in licence.split("\n\n")[0] + licence.split("\n")[1]
        if declared != reserved:
            sys.exit(f"{name}: the licence {'declares' if declared else 'does not declare'} a Reserved Font Name; fix FONTS")
        how = (
            "Converted to WOFF2 only (a Reserved Font Name is declared)."
            if reserved
            else "Converted to WOFF2 and reduced to Latin and Cyrillic."
        )
        licences.append(
            "=" * 72
            + f"\n{name}  ({fid}.woff2)\nSource: https://github.com/google/fonts/tree/main/ofl/{folder}\n{how}\n"
            + "=" * 72
            + f"\n\n{licence}\n"
        )
        print(f"{fid}: {len(data) // 1024} KB")
    (OUT / "LICENSES.txt").write_text("\n".join(licences), encoding="utf8")


main()
