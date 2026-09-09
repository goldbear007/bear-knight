# Art direction brief

## Game frame

- Player fantasy: a bear-helmed knight walking a moonlit gothic north toward the Bear King.
- Core verbs: run, jump, dash, light/heavy attack, rest at a bonfire.
- Engine and renderer: vanilla Canvas 2D in the browser / Telegram Mini App.
- Target platforms: desktop browser and phone Mini App.
- Camera/view/facing: side-scrolling, character faces ±X, native view ~960×540, tiles 32px.
- Native viewport and common display scale: 960×540 logical, scaled to CSS size with DPR cap 2.
- Typical asset size on screen: knight ~32×52; decor trees 90–160px tall; parallax strips cover the viewport height.

## Visual system

- Shape language: slender gothic (needle spires, lancet arches, carved pillars) against organic dense canopy. Interactive props stay chunkier than the painted horizon.
- Silhouette priorities: knight hood + bear muzzle, bonfire, portal arch, enemy hoods. Horizon castle may merge into mountains.
- Value structure: three bands — near-black playfield, mid silver-blue moonlight rims, warm yellow only on windows and fire.
- Palette roles and exact swatches:
  - Night: `#070b14` `#10182a` `#1a2740`
  - Moon: `#c8ead8`
  - Canopy: `#0e1a16` `#1c3d34` `#7eb89a`
  - Stone: `#cbb9a0` `#8a7a68`
  - Window/fire: `#e0a45a` `#ffcf6b`
  - Danger: `#d33f4a`
- Materials: weathered pale stone with relief carvings; heavy folded cloth; dark needle foliage; cool metal with a moonlight rim.
- Edge/line treatment: painterly lost edges on backgrounds; gameplay sprites keep a readable contact shadow. No pixel outline, no hard comic ink.
- Lighting direction and contrast: key from upper-right moon (cool). Fill is deep navy. Practical warm lights are point sources only (windows, bonfire).
- Detail density: carvings live on pillars and the horizon. Ground and platforms use a repeating weathered-stone grain; the knight still has to read on top of it.
- Motion character: restrained; cloak sway, slow cloud/star drift, bonfire flicker. No elastic squash.
- Explicit exclusions: pixel-art dither, blood-red conical wizard hoods as the default language, first-person framing, baked HUD chrome, text in paintings.

## Technical contract

- Asset dimensions/aspect: sky/far/mid 16:9 plates; props authored 3:4 then cropped to alpha bounds.
- Alpha/background: props keyed from magenta; mid canopy uses luma-to-alpha; far fades the top band.
- Grid/tile/frame size: collision stays 32×32. Fill, ground cap and floating slabs are repeating painted plates, not flat color.
- Anchor/pivot/baseline: props bottom-center on the ground line.
- Filtering/mipmaps/compression: bilinear / `imageSmoothingQuality = high` (painterly). PNG, no lossy.
- Color space: sRGB.
- Texture/poly/material budgets: six plates in `assets/art/moonwatch/`; biome identity is palette + which layers draw.
- Naming and folders: `assets/art/moonwatch/{sky,far,mid,tree,pillar,arch,seed}.png`.

## Visual target

- Approved seed/reference paths: `assets/art/moonwatch/seed.png` (variant B, Лунный дозор); user stills of the moonlit balcony painting.
- Required do/don't examples: do keep the moon large, cool, and greenish; do keep warm light as pinpoints. Don't flood the playfield with orange torch fill. Don't put unique landmarks on tile seams of mid/tree strips.
- Native-scale gameplay capture: hub scene on Иссохший лес after art load.
- Approval owner/date: user chose B on 2026-09-09.
