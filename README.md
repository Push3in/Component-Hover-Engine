# Card Hover Engine

A ribbon of small interface cards that react to your pointer. Hover a card and it grows; swipe through it and it gets knocked in the direction you swiped, spins if you hit it off-centre, then springs back home.

Inspired by the card ribbon on [graphicalui.com](https://www.graphicalui.com/). Cards are designed in Figma and rebuilt in React, and every motion setting can be tuned live with [DialKit](https://github.com/joshpuckett/dialkit).

**Status:** five cards (live weather, music player, comment status, audience sentiment, quote) sit in a row, each with its own hover grow and push. More cards and ribbon motion are next (see [Roadmap](#roadmap)).

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

- **Sizing:** `.ribbon` sets one CSS variable, `--card-scale` (1 = Figma size). Each card's text size is `16px × --card-scale`, and everything inside is in `em` (1em = 16 Figma px), so text, padding, corners and gaps all scale together.
- **Fit to screen:** `useFitScale.js` reads the window size and picks the `--card-scale` that makes the fanned ribbon fill a share of it (75% by default), using whichever of width or height runs out first. It updates on every resize, so the cards are bigger on a big monitor and smaller on a laptop.
- **Fan:** each card sits in a `.slot` that overlaps its neighbour and tilts and drops by its distance from the middle card, so the row bends along a curve. The middle card is on top, and every card has a soft drop shadow so the layers read clearly.
- **Hover grow:** when the pointer enters a card, Motion springs its `--hover-scale` multiplier from 1 to 1.2. It's part of the size calculation, so the card really resizes and its neighbours make room.
- **Push:** on every pointer move, the previous and current pointer positions form a line. If that line crosses the card, the card gets a kick in the swipe direction (stronger for faster swipes) plus spin based on how off-centre the hit was. A spring then pulls it back home. Pushes add to the card's existing momentum. Speed is capped at 2400 px/s and spin at 360°/s.

### Project structure

```
index.html              Page shell and font loading
src/main.jsx            Starts React
src/App.jsx             Frames (container → ribbon → cards), DialKit controls
src/Card.jsx            Ribbon slot: hover grow and push around any card
src/useFitScale.js      Scales the cards to fit the browser window
src/WeatherCard.jsx     Weather (Figma: Weather Components 1:2), live data from Open-Meteo
src/PlayerCard.jsx      Music player (Figma: Component-Testing C2, 1:7)
src/StatusCard.jsx      Comment status heatmap (Component-Testing C3, 1:60)
src/AudienceCard.jsx    Audience sentiment (Component-Testing C4, 12:41)
src/QuoteCard.jsx       Quote with previous / next buttons (Component-Testing C5, 12:73)
src/assets/             Images and icons exported from Figma
src/usePush.js          Pointer push physics
src/style.css           Layout, sizing system, skeleton outlines
patches/                DialKit patch applied by patch-package
docs/                   Visual guide to how it all works
```

## DialKit controls

| Control | Default | What it does |
|---|---|---|
| fill | 0.75 | How much of the window the ribbon fills; the cards scale to match |
| skeleton | off | Dashed outlines showing the container and ribbon |
| fan → overlap | 60 | How far each card slides under its neighbour (Figma px) |
| fan → angle | 6° | Tilt per step away from the middle card |
| fan → curve | 12 | How far outer cards drop to follow the curve (px per step²) |
| hover → scale | 1.2 | How much the card grows on hover |
| hover → spring | 0.3s, 0.2 bounce | How the grow feels |
| push → enabled | on | Turns the pointer push on or off |
| push → strength | 0.18 | How much of the swipe speed reaches the card |
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
- [x] Music player
- [x] Comment status
- [x] Audience sentiment
- [x] Quote
- [ ] Onboarding ("Which of these skills do you have?")
- [ ] Industry list
- [ ] Test and deploy table
- [ ] Rewards slider
- [ ] Activity chart
- [ ] Reply comment
- [ ] AI workspace menu

Then:

- [x] Lay the cards out in a row in `.ribbon`
- [ ] Make the ribbon drift sideways continuously
- [x] Fan layout: overlapping, tilted along a curve around the middle card

## Built with

- [React](https://react.dev) and [Vite](https://vite.dev)
- [Motion](https://motion.dev) for springs and animation
- [DialKit](https://github.com/joshpuckett/dialkit) for live tuning controls
- Weather data from [Open-Meteo](https://open-meteo.com)
