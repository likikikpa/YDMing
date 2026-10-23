# Texture prompts, 1024 × 1024

Sixty stand-alone prompts, one per texture. Each one can be pasted into any image generator with no setup: the rules, the style and the material are in the prompt itself. Make one image per prompt at **1024 × 1024**, square.

How the app uses a tile: it is shrunk to **128 × 128** and repeats every 48 map px, so the prompts ask for big, bold, low-contrast features, no focal point, and no gradient across the image. Ink marks are drawn heavier than they would be on paper for the same reason.

Tool settings that help:

- ChatGPT: ask for a square 1024×1024 image.
- Midjourney: add `--tile --ar 1:1` at the end of the prompt.
- Any tool with a "seamless" or "tiling" switch: turn it on.

A generator will often leave a faint seam anyway. Run the seamless pass at the bottom of this file on every result; the map also blends tiles by default, so a faint seam is acceptable. Save each file under the name shown in its heading (`fantasy-grass-lush.png`).

Check each result at 128 px wide before you keep it: if you can still see what it is, it works. If it shows a standout stone, flower or stain, regenerate it.

| Set | Style                                                                          | Count |
| --- | ------------------------------------------------------------------------------ | ----- |
| T1  | Fantasy ground, painted (matches the Painted map style and the Fantasy stamps) | 24    |
| T2  | Ink patterns (Parchment map style, Ink stamps)                                 | 12    |
| T3  | Dungeon floors, realistic                                                      | 12    |
| T4  | Atlas washes (Atlas map style)                                                 | 12    |

## T1 Fantasy ground, painted (24)

### fantasy-grass-lush

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: lush summer grass in mid green (#5E8F3E) with lighter (#7FAE4A) and darker (#43702F) patches, blades suggested by short brush flicks, a few clover patches.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-grass-dry

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: dry savanna grass in yellow-green and straw (#B5A857, #8E8A3F) with sparse bare patches of tan earth.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-meadow-flowers

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: green meadow grass with scattered small yellow and white flowers, evenly spread, no flower larger than 14 px.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-dirt-brown

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: packed brown earth (#8A6A45), soft clumps, small pebbles, faint wear marks but no clear path.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-dirt-red

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: dry red-orange clay earth (#A65A36) with small cracks and pebbles.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-mud-dark

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: wet dark brown mud (#4A3A2B) with slightly lighter glossy puddle patches and smeared swirls.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-sand-pale

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: pale beach sand (#DCCB96) with soft wind ripples and a few tiny shell flecks.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-dunes-gold

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: golden desert sand (#D4A94E) with broad soft dune ripples all running one diagonal direction, lit and shaded bands.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-snow-fresh

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: fresh snow in white and pale blue shade (#EEF3F7, #C9D8E6), soft drifts, a few tiny sparkles.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-snow-trampled

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: snow with grey-brown trampled patches, slush, and bare earth showing in places.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-ice-blue

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: blue-white ice (#A8D0E6) with a large pattern of cracks and cloudy frosty patches.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-rock-grey

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: grey bedrock (#8A8780) in large cracked slabs with darker crevices and light lichen specks.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-rock-red

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: red sandstone (#A5603F) with layered strata bands and cracks.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-cracked-earth

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: drought-cracked tan earth (#B9966A) in large polygon plates separated by dark cracks.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-swamp-murk

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: murky green swamp water (#4B5E3A) covered with duckweed, floating dark leaves and slimy patches.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-farmland-furrows

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: ploughed field with parallel furrows in dark brown (#6B4A2E) and lighter ridges, all running in one direction, slightly irregular.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-forest-floor

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: forest floor of fallen leaves in brown and olive (#6E5A33), moss patches, twigs and pine needles.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-ash-black

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: black volcanic ash and cinders (#2F2D2C) with grey drifts and small cinder lumps.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-lava-crust

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: cooled black lava crust in large plates with glowing orange cracks (#FF7A1A) between them.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-water-shallow

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: clear shallow teal water (#5FB3B8) with soft wave ripples and a faintly visible sandy bed.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-water-deep

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: deep blue water (#2B5C8A) with soft wide wave lines and darker troughs.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-cobble-grey

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: rounded grey cobblestones (#8D8B87), each 60 to 90 px wide, irregular, with dark mortar gaps.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-flagstone-warm

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: large warm sandstone flagstones (#B79B76) laid irregularly with thin dark joints, worn edges.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### fantasy-planks-oak

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Hand-painted fantasy game-map ground, visible soft brush strokes, gentle three-tone cel shading, saturated but natural colour, no outlines.

Material: oak wooden planks (#8B5E34) in parallel horizontal rows each about 100 px high, visible grain, a few nail dots, slightly varied tone per plank.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

## T2 Ink patterns (12)

### ink-stipple-sand

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: fine ink dots scattered at random for sand, dots 8 to 12 px, clustered into soft drifts, no lines.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-hatch-hills

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: short curved parallel hatch strokes arranged in staggered rows, each stroke group 60 to 90 px, suggesting rolling hills.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-cross-hatch-rock

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: irregular angular rock outlines with cross-hatching on one side of each, in a loose scatter.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-wave-lines

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: wavy horizontal ink lines for the sea, each line 200 to 300 px long, spaced 60 px apart, staggered.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-grass-ticks

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: small v-shaped grass tufts of three strokes each, about 50 px tall, scattered evenly.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-marsh-ticks

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: reed tufts with small horizontal water dashes beside them, scattered evenly.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-forest-dots

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: clusters of small round tree marks (circle with a short trunk stroke), about 55 px, scattered in loose groups.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-field-lines

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: parallel furrow lines with slightly varied spacing, all running in one direction, broken into field-like patches.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-snow-ticks

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: sparse small star-like sparkle marks and tiny dashes on mostly empty paper.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-cobble-ink

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: irregular stone outlines packed together like cobbles, each 70 to 100 px, thin ink outlines only.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-paper-plain

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: plain warm parchment with only fine paper grain and very faint fibres, no ink marks.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### ink-paper-stained

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Pen-and-ink map pattern on plain warm parchment (#EADFC4), fully opaque, drawn in warm near-black sepia ink (#2B2118) with one consistent line weight of about 8 px, slightly wobbly hand-drawn lines, marks 50 to 90 px in size spaced 50 to 70 px apart. Only paper and ink, no other colour, no grey fills, no gradients.

Material: warm parchment with faint foxing, soft tea-coloured stains and fine paper grain, no ink marks.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

## T3 Dungeon floors, realistic (12)

### real-flagstone-worn

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: worn grey dungeon flagstones, irregular rectangles 150 to 250 px, chipped edges, dark joints, light dust.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-flagstone-dark

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: dark charcoal flagstones with damp sheen, irregular, thin joints, scattered grit.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-marble-cracked

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: cracked cream marble tiles 250 px with grey veining, hairline cracks, aged.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-cave-floor

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: rough grey-brown cave rock floor, uneven, mineral streaks, small rubble.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-brick-damp

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: old red-brown bricks laid flat in running bond, each about 120 by 60 px, damp stains, moss in joints.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-sewer-stone

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: wet stone slabs with green algae stains and slime patches in the joints.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-bone-dust

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: packed grey dust floor strewn with small pale bone fragments and grit.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-checker-aged

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: chipped black and white floor tiles 200 px in a checkerboard, aged, scuffed, cracked.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-planks-rotten

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: rotten dark wooden planks about 100 px wide, warped, split, stained, a few rusty nails.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-straw-dirt

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: trodden dirt floor covered with scattered straw and a few dark stains.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-obsidian-ash

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: black obsidian-like rock with fine ash dust and faint glossy flaking.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### real-carpet-red-worn

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Photorealistic top-down material, believable surface detail, natural muted colour variation, no outlines, no stylisation.

Material: worn red woven carpet with faint gold border pattern fading, threadbare patches.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

## T4 Atlas washes (12)

### atlas-wash-grass

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: flat sage-to-forest green wash with faint paper grain and a few lighter mottled patches.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-forest

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: deeper forest green wash (#4E8A67) with soft mottling.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-sand

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: pale sand wash (#D9C48C) with faint warm mottling.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-rock

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: stone grey-green wash (#8E927B) with faint brush strokes.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-snow

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: near-white wash with faint cool grey-blue mottling.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-mud

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: brown-grey wash (#A08A6B) with soft mottling.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-sea

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: teal sea wash (#5E95A4) with very faint wavy hatch lines.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-shallow

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: light teal wash (#8EC1C4) with faint ripple marks.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-swamp

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: olive-green wash with faint short dark reed dashes.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-farmland

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: patchwork wash of pale green, ochre and sage in loose rounded patches.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-cobble

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: pale stone wash with faint rounded cobble outlines.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

### atlas-wash-parchment

```text
Seamless tileable texture, 1024x1024 px square, flat top-down view filling the whole frame edge to edge. The left edge continues into the right edge and the top edge into the bottom edge. Even diffuse light from straight above: no shadows, no light gradient, no vignette, no perspective. Large, bold, low-contrast features (every feature at least 50 px across), spread evenly, with no focal point, no standout feature and no obvious repetition. Mid-tone overall.

Style: Printed-atlas hand-coloured wash: calm flat watercolour in muted tones with faint paper grain and very light texture strokes, no outlines. Palette: teal #5E95A4, forest green #4E8A67, sage #A0B092, sand #D9C48C, stone #8E927B, brick #A8573F.

Material: warm cream parchment wash with faint paper grain.

Avoid: border, frame, text, watermark, objects, people, creatures, perspective, vignette, cast shadows, strong gradients, high contrast, tiny fine detail.
```

## Seamless pass

Attach the finished images to ChatGPT and send:

```text
For each attached image: make it seamless. Offset it by half its width and half its height (wrap around), blend the visible cross-shaped seam away with a soft feathered mask taken from the original image, and keep the result at 1024x1024. Save each as a PNG with the same file name. Show me the offset version of each so I can check the seam is gone. Put all results in one ZIP.
```

To use a result: in the Layers panel, open a texture layer and press **Use an image**. A cover image (T5 in `AI-STAMP-PROMPTS.md`) is a different thing and is not square.
