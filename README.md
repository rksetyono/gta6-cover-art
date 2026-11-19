# Neon Bay Cover Studio — Make GTA 6 Cover Art

[![make.fun bounty](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/rksetyono/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/rksetyono/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

A web app that turns your photos and a caption into GTA-style poster cover art,
exported as a PNG to share. It runs fully offline from static files — no network,
no upload, no build step.

## What it does

- **6 poster layouts** — Hero + 3, Four Panel, Triptych, tilted Snapshots, Full Bleed,
  and a 9-panel Mosaic.
- **3 photo slots** — load your own photos or the two free sample photos, fill one
  panel or every panel, then **drag to reposition and zoom** each photo inside its panel.
- **5 colour grades** — Vice Sunset, Neon Night, Palm Gold, Mono Noir, Teal Heat.
- **Bold poster lettering** — a gradient display title with outline and shadow, a neon
  subtitle, a badge ribbon, a five-star heat meter, halftone dots, a slatted retro sun
  and palm silhouettes, all drawn from scratch on canvas.
- **Undo / redo**, film grain and vignette toggles.
- **Export PNG in 1080 × 1080, 1080 × 1350 and 1920 × 1080** — one size, or all three
  at once.

## Try it

```sh
node serve.ts
# open http://localhost:8080
```

## Hand it in

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

All art, lettering and code in this repository are original. No Rockstar Games logo,
artwork or font is used. The two sample photos under `app/samples/` were made for
make.fun with an image model and are free to use.

License: MIT.
