# Video pipeline

Records the **live site** (https://component-hover-engine.vercel.app) in headless Chrome and edits it into videos. Nothing is screen-recorded by hand: a script drives the mouse, captures frames, and a Python "virtual camera" pans and zooms over them.

Finished videos are in [`renders/`](renders/):

| File | What it is |
|---|---|
| `flow-1080p-120fps.mp4` | **Latest.** 1920×1080 @ 120fps, ~36 s. One continuous camera (ease-out zooms and pans), no captions. Made by `camera.py`. |
| `cuts-1080p-24fps.mp4` | 1920×1080 @ 24fps, hard cuts + fades, no captions. Made by `edit_land.mjs` (older version). |
| `short-vertical-1080x1920.mp4` | 9:16 vertical short with corner captions. Made by `edit.mjs` (older version). |

## Set up on another Mac (once)

You need **Google Chrome** (in `/Applications`), **Node 22+** and **Python 3**.

```bash
cd video
npm install                                  # portable ffmpeg (ffmpeg-static)
python3 -m venv venv
venv/bin/pip install -r requirements.txt     # Pillow + NumPy for camera.py
```

The Timeless Sans fonts need to be installed in `~/Library/Fonts` (the site and `edit.mjs` captions use them). Without them, the cards fall back to a system font.

## Make the video

```bash
cd video
npm run record    # ~8–10 min: records take 1 (cards) and take 2 (DialKit) into frames/ and frames2/
npm run render    # ~1.5 min: camera.py → renders/flow-1080p-120fps.mp4
```

`npm run all` does both. The raw frames (~1–2 GB) are **not** in git (see `.gitignore`); `npm run record` recreates them.

## How it works

1. **`record.mjs` / `record2.mjs`** open the live site in headless Chrome via the DevTools protocol (`cdp.mjs`).
   - Take 1: 1600×1000 window at 1.5× (intro → slow hover over Player / Status / Audience → one fast swipe → Player pause/resume → Status + Audience idling).
   - Take 2: 2600×1000 window at 1.25× (wide, so the DialKit panel sits clear of the fan): open DialKit, drag Angle 6→15, Curve 12→40, Overlap 60→120, Fill 0.75→0.60.
2. **`inject.js`** runs before the page's own code. It **slows the page clock** (`RATE`, 0.06–0.07 = ~15× slower) by wrapping `performance.now`, `requestAnimationFrame`, `setTimeout`, `setInterval` and event `timeStamp`, and slows CSS/Web Animations with `Animation.setPlaybackRate`. Screenshots take ~70 ms each, but in slowed time that's ~5 ms, so we capture ~140–200 frames per second of real animation. It also draws a macOS-style cursor (headless screenshots have none).
3. Each frame is saved with its virtual timestamp (`frames.json`).
4. **`camera.py`** builds the final video: for each output frame (120fps), it picks the nearest captured frame and cuts out the camera window with Lanczos resampling at sub-pixel precision (no jitter on slow moves). The camera is a list of keyframes `(time, centre x, centre y, width, easing)` in page pixels:
   - smaller `width` = more zoomed in
   - `out` = quint ease-out (leaves at full speed, lands softly: momentum, like the X references)
   - `smooth` = gentle ease-in-out for slow drifts
   - `XFADE` = dissolve between the two takes (0.1 s)
5. **`build-master.mjs`** (only needed for the older `edit.mjs` / `edit_land.mjs`) turns frames into a constant-frame-rate `master*.mp4`:
   `npm run masters`, then `node edit_land.mjs "$(node -p "require('ffmpeg-static')")" renders/cuts.mp4`.
   Their shot timings were tuned to an earlier recording, so re-check them after re-recording.

## Gotchas we hit (so you don't again)

- **Mouse coordinates:** input must go over the **same DevTools connection** as the screenshots, and never **while a screenshot is in flight** (the `exclusive()` lock), or clicks land at the wrong spot (it looked like a 1.25–1.5× offset) and slider drags randomly fail.
- **Hover moves must be slow** (~150 px/s). The push physics reacts to any pointer crossing a card, so fast glides fling the cards around instead of showing the hover grow.
- **Don't dissolve between two framings of the same moment** (e.g. a full view and a zoomed split view): you get a doubled DialKit panel. Move one camera instead.
- Screenshots right after `Page.navigate` fail ("Not attached"): the camera loop just retries.
