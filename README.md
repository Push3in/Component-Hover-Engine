# Card Hover Engine

A ribbon of small interface cards that react to your pointer. Hover a card and it grows; swipe through it and it gets knocked in the direction you swiped, spins if you hit it off-centre, then springs back home.

Inspired by the card ribbon on [graphicalui.com](https://www.graphicalui.com/). Cards are designed in Figma and rebuilt in React, and every motion setting can be tuned live with [DialKit](https://github.com/joshpuckett/dialkit).

**Status:** the animation foundation is done, with one card (live weather). More cards will be added to the ribbon (see [Roadmap](#roadmap)).

## Run it

```bash
npm install
npm run dev
```

Then open http://localhost:8000.

`npm install` also re-applies a small patch to DialKit (see [DialKit patch](#dialkit-patch)).

## How it works

For a full visual guide with live, touchable examples, open [`docs/card-engine-explained.html`](docs/card-engine-explained.html) in a browser, or go to http://localhost:8000/docs/card-engine-explained.html while the dev server is running.

In short:

- **Sizing:** `.ribbon` sets one CSS variable, `--card-width`. Each card derives its text size from it (keeping the Figma ratio of 16px text in a 198px card), and everything inside is in `em`, so text, padding, corners and gaps all scale together.
- **Hover grow:** when the pointer enters the container, Motion springs a `--hover-scale` multiplier from 1 to 1.2. It's part of the size calculation, so the card really resizes and its containers grow with it.
- **Push:** on every pointer move, the previous and current pointer positions form a line. If that line crosses the card, the card gets a kick in the swipe direction (stronger for faster swipes) plus spin based on how off-centre the hit was. A spring then pulls it back home. Pushes add to the card's existing momentum. Speed is capped at 2400 px/s and spin at 360°/s.

### Project structure

```
index.html              Page shell and font loading
src/main.jsx            Starts React
src/App.jsx             Frames (container → ribbon → card), DialKit controls, hover state
src/WeatherCard.jsx     The weather card (Figma: Weather Components 1:2), live data from Open-Meteo
src/usePush.js          Pointer push physics
src/style.css           Layout, sizing system, skeleton outlines
patches/                DialKit patch applied by patch-package
docs/                   Visual guide to how it all works
```

## DialKit controls

| Control | Default | What it does |
|---|---|---|
| scale | 2 | Card size as a multiple of the Figma frame (`198 × scale` px wide) |
| skeleton | off | Dashed outlines showing the container and ribbon |
| hover → scale | 1.2 | How much the card grows on hover |
| hover → spring | 0.3s, 0.2 bounce | How the grow feels |
| push → enabled | on | Turns the pointer push on or off |
| push → strength | 0.1 | How much of the swipe speed reaches the card |
| push → spin | 0.5 | How much off-centre hits rotate the card |
| push → spring | 0.5s, 0.3 bounce | How the card returns home after a push |

Springs can be edited in **Time** mode (duration, bounce) or **Physics** mode (stiffness, damping, mass).

## Notes

### DialKit patch

DialKit's Physics stiffness slider is fixed at 1–1000 in steps of 10, which made values always end in 1 (131, 241…). `patches/dialkit+2.0.2.patch` changes it to **1–500 in steps of 1**. It's applied automatically after every `npm install`. If DialKit is upgraded past 2.0.2, the patch may need to be recreated.

### Springs and velocity

Motion ignores a starting velocity on duration-based springs (`visualDuration` / `bounce`) when the start and end values are the same. That's exactly what a push is: from home, back to home, with a kick. `usePush.js` therefore converts those settings to the equivalent stiffness and damping before each kick.

### Reduce motion

The push deliberately ignores the system **Reduce motion** setting, so cards always react. Users with that setting on will still see the motion.

## Roadmap

Cards planned for the ribbon, following the graphicalui set:

- [x] Weather
- [ ] Onboarding ("Which of these skills do you have?")
- [ ] Industry list
- [ ] Test and deploy table
- [ ] Rewards slider
- [ ] Activity chart
- [ ] Reply comment
- [ ] AI workspace menu

Then:

- [ ] Lay the cards out in a row in `.ribbon`
- [ ] Make the ribbon drift sideways continuously
- [ ] Possibly a "fan" layout

## Built with

- [React](https://react.dev) and [Vite](https://vite.dev)
- [Motion](https://motion.dev) for springs and animation
- [DialKit](https://github.com/joshpuckett/dialkit) for live tuning controls
- Weather data from [Open-Meteo](https://open-meteo.com)
