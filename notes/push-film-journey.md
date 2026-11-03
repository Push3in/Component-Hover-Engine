# The push-in film: how it was made (and what went wrong)

3 Nov 2026. The full story of `?film=push` (`film/renders/card-hover-engine-push-4k60.mp4`, 3840×2160, 60fps, 10.8 s), from a reference clip to the final render. Written as the raw material for a future **"make a product film from the real UI" skill**: the last section is the skill draft.

How the tools work today is in [`gsap-film-pipeline.md`](gsap-film-pipeline.md). This file is the *why*: every problem, its real cause, and the rule it left behind.

---

## 1. The goal

Make a film of the real cards that moves like a reference screen recording (an X/Grok subscription modal from the Atlas library, 5.5 s, 60fps, 3108×2160).

**Reading the reference** (frames pulled with ffmpeg into a timestamped contact sheet, 4 per second):

| Time | What it does |
|---|---|
| 0–0.5 s | Wide, still; the cursor approaches |
| 0.5–1 s | Fast ~2.5× push-in to the card row, heavy motion blur |
| 1–4.2 s | Camera follows the cursor card to card; whip pans blur between |
| 4.2–5 s | Blurred pull-back to the wide shot, settles |

Choices made with the user: **films only** (not a live-site camera); build on the existing `film/` GSAP pipeline; new code in TypeScript.

## 2. What was built

- `film/camera.ts`: a **rig** (tweened by `camera` beats) + a **follow** layer that chases the cursor with a critically damped spring (Unity's SmoothDamp: eases in and out, never overshoots). `follow.amount` blends the two. Calling `settle()` when follow starts makes the chase begin from the current view, so it eases off instead of jumping.
- `render.mjs --blur n --shutter s`: motion blur (see 5.3 for the version that survived).
- `film/pops.ts`: stickers that spring onto cards. Built, shown, **rejected by the user** ("remove the icons"); kept in the repo, unused.
- Storyboard features: `preroll`, per-film `dials` (change DialKit values mid-film), per-card props (`cards`), `follow` and `pops` beats, `?film=<name>`.
- `tsconfig.json` + `npm run typecheck`: TypeScript is checked file by file; Vite compiles `.ts` directly.

## 3. Iterations, in order

| # | User saw / asked | Real cause | Fix |
|---|---|---|---|
| 1 | — first render | — | Push-in, follow, stickers, pull-out: 5.5 s |
| 2 | "Middle card content disappears" | Status (Sleep) card runs its own loop: build in → hold 3 s → clear. The clear landed in the wide shot | `hold` prop on StatusCard; film sets it longer |
| 3 | "Keep the motion, remove the icons" | Taste | Dropped the pops beats |
| 4 | "Cursor should play with my ribbon; Sleep isn't rendering like the web" | Push physics were off; Sleep was pinned static, but on the web it loops | Push on, swipes added, Sleep loop live |
| 5 | Big blank card zoomed in; a card flung off-screen; "ribbon calculation not the same as the web" | (a) Sleep's clear landed while zoomed in. (b) **Blur render sent 480 pointer moves/s** (8 sub-steps × 60), and push adds a kick per move | Pointer moves at a fixed 60/s of film time; retimed preroll |
| 6 | Still wild when zoomed | Camera zoom magnifies every knock 2.2×; card-to-card moves were ~1,000 px/s (push reads that as a swipe) | Push **off while zoomed**, on for the wide shot; slow (~150 px/s) creep for the final hover |
| 7 | "Reduce the ribbon motion, right-to-left a little" | Render ≠ preview: **sub-stepping time made kicks stack ~3× harder** (see 5.2) | Blur from camera sub-frames only; page time steps once per frame. Per-swipe push strength |
| 8 | "Right-to-left a bit more, left-to-right a bit less" | Taste | Strength 0.13 / 0.15 (site is 0.18) |
| 9 | Player dot not centred; Sleep blank again | (a) CSS offset the dot +0.25 Figma px, invisible normally, obvious at 2.2× zoom in 4K. (b) loop clear again | `top: 50%` (fixes the live site too); Sleep `hold: 9` |
| 10 | "Put the reload intro first" | — | `preroll: 0`, every beat shifted by `INTRO = 2.8` |
| 11 | Sleep "flicks with no data" ~2.5 s | **Motion's fades ran on the browser compositor (real clock)**, so the build-in finished between screenshots: content → empty → full in a blink | Film clock deletes `Element.prototype.animate`; every fade runs on the film clock |
| 12 | Tried "start empty" for Sleep (my recommendation) → "more weird" | A blank card in the pile/fan looks broken; the web shows content there | Reverted. With 11 fixed, the web's own behaviour looks right on video |
| 13 | "Super seamless" | — | Committed `d19ba0f`, Vercel auto-deployed |

## 4. The user's taste (rules for next time)

- **Fidelity to the live site beats invention.** Anything that makes the film differ from the web (static cards, blank placeholders, stickers) gets rejected. When unsure, render what the site does.
- **An empty card on screen reads as a bug**, especially zoomed in. Time loops so their empty phase never lands on camera, or hold them.
- **Motion should feel playful but controlled.** Knocks of ~100–200 px that spring home; never cards thrown off-screen. Tune per swipe.
- **No decorations the real UI doesn't have** (stickers were cut).
- **Pixel details matter at 4K zoom**: a 0.25 px offset becomes visible. Fix it at the source (the site), not just in the film.
- Feedback comes as screenshots of the video with the player bar showing the time: read the scrubber position to find the exact moment (00:05 label can mean 4.8 s).

## 5. Technical lessons (the expensive ones)

### 5.1 Any input-driven physics depends on event rate
`usePush` adds a kick **per pointermove**. A real mouse sends ~60/s. If the film sends one per render step, the physics change with fps and blur settings. → `pointer.js` throttles moves to 60 per second of **film** time.

### 5.2 Never sub-step page time for motion blur
Sub-stepping (8 clock steps per frame) let Motion measure real velocity between kicks, so `getVelocity() + kick` stacked and knocks were ~3× the site's. At normal 60fps stepping the card hasn't moved between kicks (the new spring's first frame is at t = 0), exactly like a browser. → Blur is made by sampling **camera positions** between the previous and current frame (`film.subframe(f)`), with the page frozen. Cards look identical to the preview and site.

### 5.3 The browser compositor ignores your fake clock
Motion hands opacity/transform animations to WAAPI; Chrome runs them on the compositor on the **wall clock**. Pausing them and setting `currentTime` doesn't reliably hold them back in screenshots. Symptoms: fades pop, builds look instant. → In the film clock: `delete Element.prototype.animate` before Motion loads (Motion checks `Object.hasOwnProperty.call(Element.prototype, 'animate')`), so everything runs in JS on the film clock.

### 5.4 Zoom amplifies everything
Camera zoom multiplies on-screen speed (so push reads moves as faster) and multiplies how big each knock looks. Turn input physics off (or way down) while zoomed; keep the fun for wide shots.

### 5.5 Probe, don't guess
The breakthroughs came from measuring, not eyeballing contact sheets:
- `film/probes/push.mjs`: open `/film/?render`, step frames, log every card's transform (`DOMMatrix` → x, y, rotation) and the pointer-move count. Run with `SUB=8` to mimic sub-stepped time.
- `film/probes/fades.mjs`: log a piece's computed opacity frame by frame (it animated correctly in JS while the video showed a pop → the compositor bug).
- `film/probes/web.mjs`: web screenshots over time to see what the live site really does.
- Zoomed crop of the live site at `deviceScaleFactor: 4` to check pixel alignment.

### 5.6 Smaller things
- Element positions for camera targets come from `getBoundingClientRect` in world space; build the timeline **after** the cards mount.
- Sticker-like extras inside a card get hidden by overlapping neighbours (middle card is on top); place them on the visible side.
- `ffmpeg` filter expressions inside single quotes need no backslash escaping when passed as an argv (no shell).
- Draft at low fps / 1× first (15 s), final at 60fps / 2× with blur (~4–5 min for 10.8 s).

## 6. Skill draft: "Film the real UI"

> Turn a reference motion clip into a deterministic, frame-stepped film of the project's real components, rendered at 4K60 with motion blur.

**When to use:** the user shares a reference video (or describes camera moves) and wants a promo/demo film of their live UI.

**Steps**
1. **Read the reference.** Extract a timestamped contact sheet (`ffmpeg -vf "fps=4,drawtext=…,tile=4x6"`). Write a beat table: time → camera (wide/push/follow/pull), cursor, what reacts. Note resolution, fps, duration.
2. **Ask one question:** film only, live site, or both. (Here: film only.)
3. **Storyboard as data** (`film/storyboard.js`): beats with `at`, `camera`, `follow`, `cursor`, `dials`, `cards`. Start from page load (`preroll: 0`) if the intro is part of the brand; offset later beats from one `INTRO` constant.
4. **Draft fast:** `node film/render.mjs 20 1 draft.mp4 --film <name>` → contact sheet → look.
5. **Check fidelity before taste:** compare against screenshots of the live site over time. Anything that differs is a bug until the user says otherwise.
6. **Probe physics/fades numerically** when something looks off (5.5). Fix the cause, not the symptom (no strength hacks to cover a pipeline bug).
7. **Final:** `node film/render.mjs 60 2 film/renders/<name>-4k60.mp4 --film <name> --blur 8`, sample frames, `open` it for the user.
8. **Iterate on feedback screenshots** (read the timestamp from the scrubber). Keep a table like section 3.
9. **Ship:** build + typecheck, commit, push; Vercel auto-deploys the site part.

**Guardrails (from this film)**
- Film clock must own *all* time: `performance.now`, rAF, timers, event timestamps, `Math.random`, network fixtures, and **no WAAPI**.
- Pointer events at 60/s of film time; page time steps once per output frame; blur from camera sub-frames only.
- Input physics off while zoomed; hover moves ≤ ~150 px/s; swipes tuned per beat with `dials`.
- Never leave a component visibly empty on camera; never add UI the real product doesn't have.
- Re-verify after every pipeline fix that older films still render (`?film=tour`).
