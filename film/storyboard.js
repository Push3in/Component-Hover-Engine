// The films, as data. Pick one with /film/?film=<name> (default: tour).
// Each beat starts `at` seconds in.
//
//   caption: [verb, explanation]  two-part caption, bottom left, shown for `for` s
//   camera:  { on, zoom }         ease the camera to centre `on` (a card, or 'ribbon')
//   follow:  { amount, lag, dx, dy }  1 = the camera chases the cursor (lag in s, aim offset in world px);
//                                 0 = hand back to `camera` beats. Blends over `dur`.
//   dials:   { push: { … } }       change the cards' dials from this moment on
//   pops:    { on, items, hold }  stickers spring onto a card, leave after `hold` s (see film/pops.ts)
//   cursor:  { to, dx, dy }       glide the pointer to a card / element (+ offset, stage px)
//            { at: [x, y] }       … or to a fixed point on the stage (use off-screen points to enter / leave)
//   click:   true                 press and release under the pointer
//   title:   [line, sub]          centred end title
//
// Film options: fps, duration, preroll (s of page time run before 0, e.g. to skip the fan intro),
// dials (overrides for the cards' DialKit values, e.g. { push: { enabled: false } }),
// cards (props passed to a card by name, e.g. { quote: { … } }).
//
// Targets: 'ribbon', 'weather', 'player', 'status', 'audience', 'quote', or any CSS selector.
// Easing: camera moves use expo.out (leaves at full speed, lands softly).

const TOUR = {
  fps: 60,
  duration: 32,
  beats: [
    // 1 · The fan
    { at: 0.0, camera: { on: 'ribbon', zoom: 1.0 }, dur: 0 },
    { at: 0.9, caption: ['Spread it', 'Five cards fan out from a single pile'], for: 2.4 },

    // 2 · Player
    { at: 3.4, camera: { on: 'player', zoom: 1.9 }, dur: 1.1 },
    { at: 3.4, cursor: { at: [520, 1180] }, dur: 0 },
    { at: 3.6, cursor: { to: '.player-play' }, dur: 1.3, ease: 'power2.out' },
    { at: 3.8, caption: ['Play it', 'A live clock moves the dot and the time'], for: 3.2 },
    { at: 5.2, click: true },
    { at: 6.4, click: true },

    // 3 · Status
    { at: 7.2, camera: { on: 'status', zoom: 1.9 }, dur: 1.1 },
    { at: 7.2, cursor: { to: 'status', dx: 0, dy: 330 }, dur: 1.2, ease: 'power2.inOut' },
    { at: 7.5, caption: ['Build it', 'Every piece springs in, one after another'], for: 3.2 },

    // 4 · Audience
    { at: 11.0, camera: { on: 'audience', zoom: 1.9 }, dur: 1.1 },
    { at: 11.3, caption: ['Drag it', 'The knob moves itself; the numbers follow'], for: 3.0 },

    // 5 · Hover across the row
    { at: 14.6, camera: { on: 'ribbon', zoom: 1.08 }, dur: 1.1 },
    { at: 14.8, cursor: { to: 'player' }, dur: 1.8, ease: 'sine.inOut' },
    { at: 15.0, caption: ['Hover it', 'Each card grows under the pointer'], for: 4.8 },
    { at: 17.1, cursor: { to: 'status' }, dur: 2.6, ease: 'sine.inOut' },
    { at: 20.2, cursor: { to: 'audience' }, dur: 2.6, ease: 'sine.inOut' },
    { at: 23.2, cursor: { at: [1760, 830] }, dur: 1.0, ease: 'sine.inOut' },

    // 6 · One fast swipe
    { at: 24.5, cursor: { at: [140, 400] }, dur: 0.42, ease: 'none' },
    { at: 24.5, caption: ['Push it', 'Swipe through and they get knocked around'], for: 2.6 },

    // 7 · Quote
    { at: 27.0, camera: { on: 'quote', zoom: 1.7 }, dur: 1.1 },
    { at: 27.1, cursor: { to: '.quote-next' }, dur: 1.2, ease: 'power2.out' },
    { at: 27.3, caption: ['Change it', 'Try another quote'], for: 2.2 },
    { at: 28.5, click: true },

    // 8 · End
    { at: 29.6, camera: { on: 'ribbon', zoom: 0.92 }, dur: 1.4 },
    { at: 29.6, cursor: { at: [1900, 1180] }, dur: 1.0, ease: 'power2.in' },
    { at: 29.9, title: ['Card Hover Engine', 'component-hover-engine.vercel.app'], for: 2.1 },
  ],
};

// The push-in reel (~8 s): wide → fast push into the row → the camera
// follows the pointer card to card → pull back out → the pointer plays with the
// ribbon: two fast swipes knock the cards around, then a slow hover to finish.
// The Sleep card builds in once (its own animation) and holds to the end.
// Render it with motion blur:  node film/render.mjs 60 2 film/renders/card-hover-engine-push-4k60.mp4 --film push --blur 8
// Opens on the page-load intro, exactly like reloading the site: the cards pop
// into a pile in the middle, then spread out into the fan. Everything after
// it is timed from INTRO (when the fan has settled).
const INTRO = 2.8;
const PUSH = {
  fps: 60,
  duration: INTRO + 8,
  preroll: 0, // start from page load, so the intro is in the film
  // Sleep: shows its contents in the pile and fan, builds in once when the fan
  // settles (exactly like the site), then stays built to the end
  cards: { status: { hold: 9 } },
  beats: [
    { at: 0, camera: { on: 'ribbon', zoom: 1.0 }, dur: 0 }, // wide from the start, the intro plays as on the site
  ].concat([ // ↓ times from here on are relative to INTRO
    { at: 0.0, cursor: { at: [1180, 1160] }, dur: 0 },
    { at: 0.15, cursor: { to: 'player', dx: 30, dy: 120 }, dur: 0.9, ease: 'power2.out' },

    // Push in: fast through the middle, so the blur peaks there.
    // No push physics while zoomed in: the camera magnifies every knock 2.2×,
    // so a nudge would look like the cards being thrown. Hover still works.
    { at: 0.5, camera: { on: 'player', zoom: 2.2 }, dur: 0.6, ease: 'power3.inOut' },
    { at: 0.5, dials: { push: { enabled: false } } },

    // Hand the camera to the pointer and move across the row
    { at: 1.15, follow: { amount: 1, lag: 0.2, dy: -50 } },
    { at: 1.6, cursor: { to: 'status', dx: -10, dy: 120 }, dur: 0.55, ease: 'power2.inOut' },
    { at: 2.6, cursor: { to: 'audience', dx: -10, dy: 120 }, dur: 0.55, ease: 'power2.inOut' },

    // Pull back out to the whole ribbon
    { at: 3.5, follow: { amount: 0 }, dur: 0.7, ease: 'power3.inOut' },
    { at: 3.5, camera: { on: 'ribbon', zoom: 1.0 }, dur: 0.7, ease: 'power3.inOut' },
    { at: 3.6, cursor: { at: [1780, 860] }, dur: 0.6, ease: 'power2.inOut' },

    // Play with it (wide, push physics back on, same as the site): swipe through
    // the row and back, the cards get knocked around and spring home
    // (Push strength sets how hard a swipe knocks: swipe speed barely matters, a
    // slower swipe just sends more, smaller kicks. The site uses 0.18.)
    { at: 4.25, dials: { push: { enabled: true, strength: 0.13 } } }, // right → left: a touch gentler than the site
    { at: 4.3, cursor: { at: [150, 480] }, dur: 0.6, ease: 'none' },
    { at: 5.2, dials: { push: { strength: 0.15 } } },                 // left → right: a bit gentler than the site
    { at: 5.25, cursor: { at: [1780, 600] }, dur: 0.6, ease: 'none' },

    // Settle: go round under the row, then creep up onto the middle card
    // (hover moves stay slow, ~150 px/s, or the push physics read them as swipes)
    { at: 6.0, cursor: { at: [1780, 900] }, dur: 0.35, ease: 'power2.inOut' },
    { at: 6.35, cursor: { at: [960, 900] }, dur: 0.6, ease: 'power2.inOut' },
    { at: 6.95, cursor: { to: 'status', dy: 90 }, dur: 1.0, ease: 'sine.out' },
  ].map((beat) => ({ ...beat, at: beat.at + INTRO }))),
};

export const FILMS = { tour: TOUR, push: PUSH };
