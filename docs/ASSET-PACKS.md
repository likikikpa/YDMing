# Art packs for YDMing

Research from 21 October 2026. The goal: art closer to Inkarnate's painted and hand-inked stamps than the Kenney packs already bundled. Licences below come from each seller's page or from search snippets; the column "Checked" says which. Re-read the licence file inside a download before bundling anything.

Two rules shape the list:

- Only packs whose licence allows redistribution can be bundled with the app (CC0, CC-BY). Everything else is for a DM to buy and import into **My stamps** on their own computer. Nothing here points to unlicensed copies of paid packs.
- The README promises no AI-generated art, so listings tagged as AI-assisted are left out.

## Status

Bundled in the app: #5 Mark Gosbell's dungeon assets (the Library's "Dungeon dressing" collection) and #9 Poly Haven textures (15 of them, under Photo textures in the Layers panel). Run `node scripts/import-gosbell.mjs` and `python3 scripts/import-polyhaven.py` to fetch them again.

Not bundled: #1 Simple Stamps could not be downloaded here (the site answers 403) and its licence is unconfirmed. #2, #3, #4, #7 and #8 do not allow redistribution; import them yourself with **Import pack** in My stamps. #6 and #10 are unconfirmed.

## Links reviewed on 22 October 2026

| Link | Licence | In the app? |
|------|---------|-------------|
| [Classic Dungeon Map Symbols](https://markgosbell.itch.io/classic-dungeon-map-symbols) (free) | CC0 | Yes: the Library's "Classic dungeon symbols" (86 old-school symbols: doors, stairs, traps, furniture), drawn to grid squares on dungeons. `node scripts/import-classic-dungeon.mjs` |
| [Amanz Fantasy Map Assets Pack Lite](https://amanz.itch.io/fantasy-map-assets-pack-lite) (free) | CC BY 4.0 on the page; its readme says no credit needed | Yes, the 41 icons only, as "Map icons". They are flat black silhouettes (buildings, markers, trees) with hand-inked mountain ridges, not painted art. Placing one adds the credit to the world. The 4K backgrounds, overlays and islands are left out. `python3 scripts/import-amanz.py` |
| [Wuggy's Classic Cartography Set](https://wuggy.itch.io/wuggys-classic-cartography-set) ($1.50) and [Urban Cartography Set](https://wuggy.itch.io/wuggys-urban-cartography-set) ($2.00) | CC BY 4.0, so bundling is allowed with credit | Not yet: they cost money and could not be downloaded here. Buy them and use **Import pack** with `ImageAssets.zip` (342 and 514 PNGs), or hand the ZIP over and it can be bundled with the credit. |
| [Narrasil](https://monkeyblooddesign.itch.io/narrasil) ($7) and [Myrklund](https://monkeyblooddesign.itch.io/myrklund) ($9) | Personal use only | No. Import your own copy with **Import pack**. |
| [Fantasy Map Design's Simple Stamps](https://cartographyassets.com/assets/4940/fantasy-map-designs-simple-stamps/) (free) and [Fantasy Map Assets 56](https://cartographyassets.com/assets/104097/56-fantasy-map-symbols-wonderdraft-png-svg-eps/) (EUR 6) | Simple Stamps: CC BY 4.0 per search results; the other is not confirmed | No. The site answers 403 to anything but a logged-in browser. Download them yourself and use **Import pack**. |

## Packs that fit

| # | Pack | Style | Price | Licence | Bundle with the app? | Checked |
|---|------|-------|-------|---------|----------------------|---------|
| 1 | [Fantasy Map Design: Simple Stamps](https://cartographyassets.com/assets/4940/fantasy-map-designs-simple-stamps/) | Hand-drawn mountains, hills, trees, settlement icons | Free | CC-BY 4.0 (credit the author) | Yes, with credit | Search snippet; the page itself returned 403 |
| 2 | [Narrasil Fantasy Map Icons](https://monkeyblooddesign.itch.io/narrasil) (sister sets: [Myrklund](https://monkeyblooddesign.itch.io/myrklund), [Havenland](https://monkeyblooddesign.itch.io/havenland)) | Ink line art, 68 symbols: hills, mountains, trees, towns, castles, ruins, bridges, compass | $7+ | Personal use; commercial licence sold separately | No, import only | Page read |
| 3 | [Map Icons Bundle](https://itch.io/s/201723/map-icons-bundle) | Painted parchment, muted watercolour with fine ink: fantasy, dungeon, city, sea and haunted icons, borders and cartouches, terrain stamps (54 each) | $7.99 for 11 packs | Not stated on the bundle page; read each pack's page | No, import only | Bundle page read |
| 4 | [Vintage Fantasy World Pack](https://fantasymapassets.com/product/vintage-fantasy-world-pack-vintage-various-assets/) | Hand-drawn old-map illustrations, PNG in colour or black and white | EUR 4.50 | Free for commercial maps; reselling the base items alone is not allowed | No, import only | Page read |
| 5 | [70+ Free Flat Greyscale Dungeon Assets](https://markgosbell.itch.io/70-free-flat-greyscale-dungeon-assets) | Flat greyscale old-school dungeon dressing: tables, chests, bookshelves, barrels, crates; 70 px per square; grass, stone and floorboard tiles | Free | CC0 | Yes | Page read |
| 6 | [DnDungeon free demos](https://dndungeon.com/blogs/faq/free-dungeondraft-assets-whats-available-where-to-find-them) | Printable black-and-white blueprint set, plus an Asia-inspired painted sampler | Free demos, paid full packs | "Creative Commons" per the seller's FAQ; exact licence not confirmed | Only after reading the licence file | Search snippet; the page returned 429 |
| 7 | [Forgotten Adventures](https://new.forgotten-adventures.net/about/) | Semi-realistic painted top-down assets and tokens, the closest to Inkarnate's depth | Free for personal use, Patreon tiers | Personal use; commercial needs a licence, which excludes use inside software | No, import only | About page and 2018 licence post |
| 8 | [Tom Cartos](https://www.patreon.com/posts/54056153) | Painted battlemap assets | Patreon | Older posts say CC BY-NC-SA; a 2023 post replaces them and limits redistribution | No, import only | Search snippets; terms are split over several posts |
| 9 | [Poly Haven textures](https://polyhaven.com/license) | Photographic ground: dirt, sand, rock, snow, cobble, wood. Gives the terrain a painted-realistic look under the texture layers | Free | CC0, confirmed on the licence page | Yes, 1K versions are enough for a browser | Page read |
| 10 | [ambientCG](https://docs.ambientcg.com/) | Same idea as Poly Haven, over 2,000 materials | Free | CC0 per third-party guides; I could not reach its licence page | Yes, after confirming the licence page | Not confirmed |

Best first picks to bundle: 1, 5 and 9. Best first picks to support through import: 2, 3 and 4. Number 7 gives the strongest look but only for personal use.

## Seen and left out

- [Legendary Adventure Studio](https://legendaryadventurestudio.itch.io/stylized-nature-assets): hand-painted foliage, but the listing is tagged as AI-assisted and commercial use needs a patron licence.
- [Kenney Scribble Dungeons](https://kenney-assets.itch.io/scribble-dungeons): CC0, but it is the same look as the bundled Kenney packs.
- [Top Down Dungeon Pack](https://screamingbrainstudios.itch.io/top-down-dungeon-pack) (CC0, 64 px tiles), [Top down trees pack](https://wabsa-kha.itch.io/top-down-trees-pack) (CC0) and [Trees & Bushes](https://opengameart.org/content/trees-bushes) (CC0): pixel art, far from the target look.
- [Devin Night's tokens](https://forum.profantasy.com/discussion/comment/4783): free, but not for commercial use without his written permission.
- [ProFantasy monthly symbols](https://www.profantasy.com/pages/free-monthly-content): free, but only inside Campaign Cartographer.
- Venatus Maps Regional Assets (Wonderdraft, free on Patreon) and the [old-cartography megapacks on Cartography Assets](https://cartographyassets.com/assets/56591/old-cartography-top-down-mountains-assets-megapack-2/): good look, licence not confirmed or redistribution not allowed.

## What this means for the app

Nothing both free to bundle and at Inkarnate quality turned up. Free and bundleable gives a solid dungeon set, a hand-drawn overland set and real ground textures. The painted look comes from packs a DM buys, so the app needs to take a whole pack in one step (many PNGs or a ZIP into **My stamps**) rather than one image at a time.
