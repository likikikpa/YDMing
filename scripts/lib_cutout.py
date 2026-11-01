"""Cuts a stamp out of a flat magenta (#FF00FF) background.

Used by the import scripts for generated art. The background is the magenta
that touches the picture's border, found by flood fill, so a magenta-like
colour inside the drawing is never removed. The edge is softened and the
magenta spill on it is pulled out, so a stamp does not carry a pink halo
onto green ground. Needs Pillow and numpy.
"""
from collections import deque

import numpy as np
from PIL import Image

# How magenta a pixel is: min(R, B) - G, 0..255. Browns, greens, greys and
# reds are at or below 0; the background is near 255.
SOLID_BELOW = 50
CLEAR_ABOVE = 150
# A pocket of strong magenta that the border cannot reach (between a tree and
# a roof, say) is background too once it is this many pixels big. Smaller
# ones are pink details of the drawing and stay.
POCKET_SCORE = 130
# Width in pixels of the edge band that is despilled, and the pink at which
# a pixel of that band is fully transparent.
EDGE_BAND = 3
# Inside the drawing, a pixel this pink is magenta showing through, not paint.
INTERIOR_PINK = 70
FADE_OVER = 110
POCKET_MIN_AREA = 4


def magenta_score(rgb: np.ndarray) -> np.ndarray:
    r, g, b = (rgb[..., i].astype(np.int16) for i in range(3))
    return np.minimum(r, b) - g


def border_background(score: np.ndarray) -> np.ndarray:
    """Pixels that are background-coloured and connected to the border."""
    h, w = score.shape
    candidate = score > SOLID_BELOW
    seen = np.zeros_like(candidate)
    queue: deque[tuple[int, int]] = deque()
    for x in range(w):
        for y in (0, h - 1):
            if candidate[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    for y in range(h):
        for x in (0, w - 1):
            if candidate[y, x] and not seen[y, x]:
                seen[y, x] = True
                queue.append((y, x))
    while queue:
        y, x = queue.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not seen[ny, nx]:
                seen[ny, nx] = True
                queue.append((ny, nx))
    return seen


def enclosed_pockets(score: np.ndarray, outside: np.ndarray) -> np.ndarray:
    """Strong-magenta regions, not touching the border, of at least POCKET_MIN_AREA pixels."""
    h, w = score.shape
    candidate = (score > POCKET_SCORE) & ~outside
    seen = np.zeros_like(candidate)
    pockets = np.zeros_like(candidate)
    for sy, sx in zip(*np.nonzero(candidate)):
        if seen[sy, sx]:
            continue
        seen[sy, sx] = True
        queue = deque([(sy, sx)])
        region = []
        while queue:
            y, x = queue.popleft()
            region.append((y, x))
            for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                if 0 <= ny < h and 0 <= nx < w and candidate[ny, nx] and not seen[ny, nx]:
                    seen[ny, nx] = True
                    queue.append((ny, nx))
        if len(region) >= POCKET_MIN_AREA:
            ys, xs = zip(*region)
            pockets[list(ys), list(xs)] = True
    return pockets


def cut_out(image: Image.Image) -> Image.Image:
    """An RGBA copy of `image` with its magenta background made transparent."""
    rgb = np.asarray(image.convert("RGB")).copy()
    score = magenta_score(rgb)
    bg = border_background(score)
    # Grow each pocket a little so its anti-aliased rim goes with it.
    pockets = enclosed_pockets(score, bg)
    if pockets.any():
        grown = pockets.copy()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            grown |= np.roll(np.roll(pockets, dy, 0), dx, 1) & (score > SOLID_BELOW)
        bg = bg | grown
    # Background pixels fade out by how magenta they are; everything else is opaque.
    alpha = np.where(bg, np.clip(1 - (score - SOLID_BELOW) / (CLEAR_ABOVE - SOLID_BELOW), 0, 1), 1.0)
    # Drawing pixels within a few pixels of the background are mixes of ink
    # and magenta (fine foliage is mostly such pixels): fade them by their
    # pink and pull the pink out of their colour, so no fringe is left.
    band = bg.copy()
    for _ in range(EDGE_BAND):
        grown = band.copy()
        for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
            grown |= np.roll(np.roll(band, dy, 0), dx, 1)
        band = grown
    # Tiny gaps between twigs, enclosed by the drawing, are mixes too.
    band |= score > INTERIOR_PINK
    mixed = band & ~bg
    pink = np.clip(score, 0, 255)
    alpha[mixed] = np.clip(1 - pink[mixed] / FADE_OVER, 0, 1)
    fix = band & (pink > 0)
    for c in (0, 2):
        channel = rgb[..., c].astype(np.int16)
        channel[fix] -= (pink[fix] * 0.95).astype(np.int16)
        rgb[..., c] = np.clip(channel, 0, 255).astype(np.uint8)
    out = np.dstack([rgb, (alpha * 255).round().astype(np.uint8)])
    return Image.fromarray(out, "RGBA")


JOIN = 1  # pieces closer than about 8 px (blocks of 4 px) are one chunk


def split_objects(cut: Image.Image, expected: int) -> tuple[list[Image.Image], list[str]]:
    """Separates a cut-out sheet of 3 columns of objects into its objects, in reading order.

    Objects can be wider than their cell of the grid (a ship, an inn with its
    sign), so cropping cells would clip them. Instead pieces that almost touch
    are joined into chunks, specks are dropped, and each chunk goes to the
    cell that holds its centre. Returns the objects and warnings.
    """
    warnings: list[str] = []
    alpha = np.asarray(cut.getchannel("A"))
    h, w = alpha.shape
    block = 4
    small = alpha[: h // block * block, : w // block * block] > 8
    small = small.reshape(h // block, block, w // block, block).any(axis=(1, 3))

    def group(gap: int):
        grown = small.copy()
        for _ in range(gap):
            step = grown.copy()
            for dy, dx in ((-1, 0), (1, 0), (0, -1), (0, 1), (-1, -1), (1, 1), (-1, 1), (1, -1)):
                step |= np.roll(np.roll(grown, dy, 0), dx, 1)
            grown = step
        labels = np.zeros(small.shape, dtype=np.int32)
        count = 0
        for sy, sx in zip(*np.nonzero(grown)):
            if labels[sy, sx]:
                continue
            count += 1
            labels[sy, sx] = count
            queue = deque([(sy, sx)])
            while queue:
                y, x = queue.popleft()
                for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
                    if 0 <= ny < grown.shape[0] and 0 <= nx < grown.shape[1] and grown[ny, nx] and not labels[ny, nx]:
                        labels[ny, nx] = count
                        queue.append((ny, nx))
        # Only the drawing's own pixels count towards a group's size and place.
        found: dict[int, dict] = {}
        for label in range(1, count + 1):
            ys, xs = np.nonzero((labels == label) & small)
            if len(ys):
                found[label] = {"area": len(ys), "cx": xs.mean(), "cy": ys.mean(), "ids": {label}}
        if found:
            top = max(g["area"] for g in found.values())
            for label in [k for k, g in found.items() if g["area"] < top * 0.004]:
                del found[label]
        return labels, found

    # Join only pieces that almost touch (twigs, a hanging sign, a mast), then
    # give each chunk to the grid cell that holds its centre. A chunk may
    # spill over its cell; its centre decides, so wide objects stay whole and
    # the objects of one cell (three standing stones) become one object.
    labels, chunks = group(JOIN)
    if not chunks:
        return [], ["the sheet is empty"]
    cols, rows = 3, max(1, expected // 3)
    cells: dict[int, dict] = {}
    for k, c in chunks.items():
        col = min(int(c["cx"] / (small.shape[1] / cols)), cols - 1)
        row = min(int(c["cy"] / (small.shape[0] / rows)), rows - 1)
        cell = cells.setdefault(row * cols + col, {"area": 0, "ids": set(), "cx": 0.0, "cy": 0.0})
        cell["area"] += c["area"]
        cell["ids"] |= c["ids"]
    for n in range(expected):
        if n not in cells:
            warnings.append(f"cell {n + 1} of the sheet is empty")
    ordered = [cells[n] for n in sorted(cells)]
    groups = cells
    objects = []
    for g in ordered:
        mask = np.isin(labels, list(g["ids"]))
        full = np.repeat(np.repeat(mask, block, 0), block, 1)
        full = np.pad(full, ((0, h - full.shape[0]), (0, w - full.shape[1])))
        piece = np.asarray(cut).copy()
        piece[..., 3] = np.where(full, piece[..., 3], 0)
        objects.append(Image.fromarray(piece, "RGBA"))
    return objects, warnings
