# GSAP and "films as code"

## Try it (when you're back)

```bash
git pull
npm install                 # installs GSAP (it's per project: run this in each project that uses it)
cd video && npm install && cd ..   # portable ffmpeg, used by the renderer
npm run dev
```

1. **Preview:** open http://localhost:8000/film/. A small 3-scene film plays on loop. Drag the scrubber to jump to any frame; Pause / Play.
2. **Render:** with the dev server still running, in a second terminal:
   ```bash
   node film/render.mjs 60 1 film/out-1080p60.mp4   # 1920×1080, 60fps
   node film/render.mjs 60 2 film/out-4k60.mp4      # same film at 3840×2160
   node film/render.mjs 120 1 film/out-1080p120.mp4 # 120fps
   ```
   Tested here: an 8.55 s film → 513 frames at 60fps, 1920×1080.
3. **Edit like code:** in `film/main.js`, change a line in `STORYBOARD` (e.g. `to: 7250` → `to: 4200`, or a caption) and the preview updates instantly; re-render to get the new video.

Files:

| File | |
|---|---|
| `film/index.html` | 1920×1080 stage + preview controls (only served by the dev server, not deployed) |
| `film/main.js` | Storyboard (data) → scenes (DOM + GSAP) → one master timeline; exposes `window.film.seek(t)` |
| `film/film.css` | Card / caption styles in the same language as the ribbon cards |
| `film/render.mjs` | Opens `/film/?render` in headless Chrome, **seeks the timeline to each frame's time**, screenshots, pipes to ffmpeg |

### GSAP in 30 seconds

```js
import gsap from 'gsap';

const tl = gsap.timeline({ paused: true });          // a scrubbable timeline
tl.fromTo(card, { y: 80, autoAlpha: 0 },              // from …
                { y: 0, autoAlpha: 1, duration: 0.9, ease: 'expo.out' })  // … to, with an ease-out
  .to(counter, { v: 9831, duration: 1.3, onUpdate: draw }, '<0.2')        // '<0.2' = start 0.2 s after the previous one starts
  .to(card, { y: -40, autoAlpha: 0, duration: 0.35, ease: 'power3.in' }); // exit

tl.play();       // preview
tl.seek(2.5);    // jump to exactly 2.5 s: this is what makes frame-by-frame rendering exact
```

- **Position parameter** (`'<'`, `'<0.2'`, `'-=0.15'`, `'+=1'`) places tweens relative to each other: that's how scenes overlap and stagger.
- **Eases:** `expo.out` (punchy ease-out with momentum, like the X references), `power3.inOut`, `none` (linear drift). Keep a small set and reuse it everywhere ("brand easing").
- **It doesn't replace Motion in the app.** The cards use Motion (springs, hover, push). GSAP is for **authored films** where you want a timeline you can scrub and seek.

## Why this is better than recording the live site

Our `video/` pipeline records the real site with a slowed clock. It works, but the cursor and push physics are live, so takes vary and need re-recording. A GSAP film is **deterministic**: the same code gives the same frames every time, at any fps or resolution, and a change is one line plus a re-render.

Next step, if you like the test: build scenes around the **real card components** (render `<PlayerCard />` etc. into the stage) and drive them from the timeline instead of the pointer.

---

## Emil Widlund's thread, broken down

https://x.com/emilwidlund/status/2115213417539879300 (27 Oct 2026). He's the only designer at Polar.

1. **No After Effects.** *"Every frame is code: TypeScript, a browser and a timeline."* (85 s, 4K60 Polar launch film.)
2. **Why:** one designer, a fast "agentic" industry: *"work smarter, not harder."*
3. **A film is one file, a storyboard.** Each scene is a few lines of data. Scenes are TypeScript modules that build plain DOM and animate it with **GSAP**, *on the same easing curves as the rest of the brand*.
4. **Preview and render.** Runs live in the browser, scrubbable to any frame. To render, **Playwright opens it in headless Chrome, steps the clock one frame at a time and hands every frame to ffmpeg**: 2,022 frames at 60fps, 1080p or 4K from the same code. (Our `film/render.mjs` does exactly this with `seek(t)`.)
5. **Sound is code too.** Scenes place **cues** (key press, a tick as text streams, a tap when a payment lands); each is a real recording mixed offline in sync with the frames. The music is placed so its biggest lift lands on the logo. His config (screenshot in the thread) shows:
   - `mute: ['rise','swish','lift','shutter']`: *"Movement is silent; only landings, keys and small clicks are heard."*
   - typing from one real recording cut into `takes` (time ranges) plus an `enter` key slice, with `gain` / `ceiling`
   - six variant `land-0N.flac` samples so repeated hits don't sound identical
   - `music: { sync: { track: 57.2, scene: 'outro', offset: 0.45 }, level: -21 }`: the track's lift at 57.2 s is pinned to the outro
   - a quiet vinyl-static layer at −42 dB under everything
   - comments recording decisions ("user's call"): the config doubles as a design log
6. **Directs Claude Code with taste, not instructions:** hands it reference clips whose pacing he likes.
7. **Reviews like a design crit:** *"this feels like someone clicking a button"*, *"no whooshes"*, *"never invent a color"*, and **every note becomes a rule it keeps across sessions**.
8. **Changes are cheap:** swapping the course in the film was one constant + a re-render: *"edit like code, not redo"*. No Claude skills used.
9. **Effort:** ~2 hours, ~60 adjustment prompts per film; a 1:30 4K60 render takes ~6 min.
10. Two more ~33 s example films.

What the film itself looks like (sampled frames): one UI card per beat, centred on near-black; a **two-part caption bottom-left** (bold verb + muted explanation: "**Define it** Meters and prices live in your repo, as code", "Deploy it", "Meter it", "Price it", "Simulate it"); numbers counting, sliders dragging, toggles flipping; the old card slips away and dims in ~0.2 s, the next flies in with a fast ease-out and a long settle; a slow constant drift during holds so nothing is ever fully still; abstract interludes between beats; ends on the logo. The `film/` test borrows the caption pattern, the ease-out entrances and the drift.

### Ideas to borrow for this project

- A `film/` storyboard for a Card Hover Engine launch film (scenes = cards), scrubbable, rendered at 4K60 / 120fps.
- Keep the camera eases and the cards' springs as one shared set of curves.
- Sound cues: a soft tick when the Player's play button is pressed, a tap when a card lands from the pile; no whooshes on movement.
- Turn your review notes into lasting rules (e.g. in the project's `CLAUDE.md`), so every session keeps your taste.
