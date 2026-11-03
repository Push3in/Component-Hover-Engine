import { useEffect, useState } from 'react';
import { DialRoot, useDialKit } from 'dialkit';
import Card from './Card.jsx';
import useFitScale from './useFitScale.js';
import { IntroDone } from './introContext.js';
import { savedSlowMotion, setSlowMotion } from './slowMotion.js';
import WeatherCard from './WeatherCard.jsx';
import PlayerCard from './PlayerCard.jsx';
import StatusCard from './StatusCard.jsx';
import AudienceCard from './AudienceCard.jsx';
import QuoteCard from './QuoteCard.jsx';

// Ribbon order, left to right, with each card's width at Figma size.
// Weather hugs its live text, so its width is a typical value.
const CARDS = [
  { Content: WeatherCard, width: 224 },
  { Content: PlayerCard, width: 240 },
  { Content: StatusCard, width: 250 },
  { Content: AudienceCard, width: 250 },
  { Content: QuoteCard, width: 240 },
];

// Tallest card at Figma size (Status)
const TALLEST_CARD = 188;

export default function App() {
  const dials = useDialKit('Card', {
    // How much of the window the ribbon fills (0.75 = 75%); the cards scale to match
    fill: [0.75, 0.3, 1, 0.01],
    // Largest the cards get (× Figma size), so big monitors don't blow them up
    maxScale: [2.25, 0.5, 4, 0.05],
    // Outline the containers to inspect layout
    skeleton: false,
    // Run every animation slower to inspect it (remembered across reloads, so
    // the page-load intro plays slowed too)
    slowMotion: {
      enabled: savedSlowMotion.enabled,
      // Playback speed while on (0.25 = quarter speed)
      speed: [savedSlowMotion.speed, 0.05, 1, 0.05],
    },
    fan: {
      // How far each card slides under its neighbour (Figma px)
      overlap: [60, 0, 200, 1],
      // Tilt per step away from the middle card (degrees)
      angle: [6, 0, 20, 0.5],
      // How far the outer cards drop to follow the curve (Figma px per step²)
      curve: [12, 0, 60, 1],
    },
    // Page-load intro: cards pop into a pile in the middle one by one, then
    // spread into the fan (changes apply on the next reload)
    intro: {
      // Seconds before the first card pops in
      delay: [0.3, 0, 2, 0.05],
      // Gap between each card popping into the pile (0 = all at once)
      appearStagger: [0, 0, 0.5, 0.01],
      // Size a card pops in from (× pile size)
      popFrom: [0.6, 0.1, 1, 0.01],
      // Spring for popping into the pile
      appearSpring: { type: 'spring', visualDuration: 0.4, bounce: 0.35 },
      // Pause after the last card pops in, before they spread
      hold: [0.45, 0, 2, 0.05],
      // Extra wait per step away from the middle card when spreading
      stagger: [0.06, 0, 0.5, 0.01],
      // Size of the pile (× final size)
      scale: [0.85, 0.3, 1, 0.01],
      // Spring for spreading out into the fan
      spring: { type: 'spring', visualDuration: 0.8, bounce: 0.25 },
    },
    hover: {
      scale: [1.2, 1, 2, 0.05],
      // Spring for growing / shrinking
      spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
    },
    push: {
      enabled: true,
      // How much of the pointer's speed is passed on to the card
      strength: [0.18, 0, 1, 0.01],
      // How much off-centre swipes spin the card
      spin: [0.5, 0, 2, 0.05],
      // Spring that brings the card back home after a push
      spring: { type: 'spring', visualDuration: 0.5, bounce: 0.3 },
    },
  });

  // The fanned ribbon's size at Figma size: card widths minus the overlaps,
  // and the tallest card plus how far the outer cards drop along the curve
  const middle = (CARDS.length - 1) / 2;
  const ribbonWidth =
    CARDS.reduce((sum, card) => sum + card.width, 0) - dials.fan.overlap * (CARDS.length - 1);
  const ribbonHeight = TALLEST_CARD + dials.fan.curve * middle * middle;
  const scale = Math.min(useFitScale(ribbonWidth, ribbonHeight, dials.fill), dials.maxScale);

  useEffect(() => {
    setSlowMotion(dials.slowMotion.enabled, dials.slowMotion.speed);
  }, [dials.slowMotion.enabled, dials.slowMotion.speed]);

  // Order the cards pop into the pile: outer ones first (they sit underneath),
  // the middle card last, on top. Left before right at the same distance.
  const appearOrder = CARDS.map((_, i) => i).sort(
    (a, b) => Math.abs(b - middle) - Math.abs(a - middle) || a - b
  );

  // Which cards have finished springing out to their spot on page load
  const [settled, setSettled] = useState(() => new Set());
  const introDone = settled.size === CARDS.length;

  return (
    <>
      <main className={dials.skeleton ? 'container skeleton' : 'container'}>
        <IntroDone.Provider value={introDone}>
        <div className="ribbon" style={{ '--card-scale': scale }}>
          {CARDS.map(({ Content }, i) => (
            <Card
              key={i}
              offset={i - middle}
              appearIndex={appearOrder.indexOf(i)}
              count={CARDS.length}
              fan={dials.fan}
              hover={dials.hover}
              intro={dials.intro}
              onIntroDone={() => setSettled((done) => new Set(done).add(i))}
              push={dials.push}
            >
              <Content />
            </Card>
          ))}
        </div>
        </IntroDone.Provider>
      </main>
      {/* How it all works: the visual guide in public/docs/ */}
      <a className="docs-link" href="/docs/card-engine-explained.html">
        How it works →
      </a>
      {/* Shown on the live site too, not just the dev server; starts closed */}
      <DialRoot productionEnabled defaultOpen={false} />
    </>
  );
}
