// The film, as data. Each beat starts `at` seconds in.
//
//   caption: [verb, explanation]  two-part caption, bottom left, shown for `for` s
//   camera:  { on, zoom }         ease the camera to centre `on` (a card, or 'ribbon')
//   cursor:  { to, dx, dy }       glide the pointer to a card / element (+ offset, stage px)
//            { at: [x, y] }       … or to a fixed point on the stage (use off-screen points to enter / leave)
//   click:   true                 press and release under the pointer
//   title:   [line, sub]          centred end title
//
// Targets: 'ribbon', 'weather', 'player', 'status', 'audience', 'quote', or any CSS selector.
// Easing: camera moves use expo.out (leaves at full speed, lands softly).

export const FILM = {
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
