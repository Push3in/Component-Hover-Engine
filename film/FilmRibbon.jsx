// The real ribbon from src/, with the DialKit defaults baked in (the film has no
// panel) and a fixed card scale for the 1920×1080 stage.
import { useState } from 'react';
import Card from '../src/Card.jsx';
import { IntroDone } from '../src/introContext.js';
import WeatherCard from '../src/WeatherCard.jsx';
import PlayerCard from '../src/PlayerCard.jsx';
import StatusCard from '../src/StatusCard.jsx';
import AudienceCard from '../src/AudienceCard.jsx';
import QuoteCard from '../src/QuoteCard.jsx';

const CARDS = [WeatherCard, PlayerCard, StatusCard, AudienceCard, QuoteCard];

// Same values as the DialKit defaults in src/App.jsx
export const DIALS = {
  fan: { overlap: 60, angle: 6, curve: 12 },
  intro: {
    delay: 0.3, appearStagger: 0, popFrom: 0.6, hold: 0.45, stagger: 0.06, scale: 0.85,
    appearSpring: { type: 'spring', visualDuration: 0.4, bounce: 0.35 },
    spring: { type: 'spring', visualDuration: 0.8, bounce: 0.25 },
  },
  hover: { scale: 1.2, spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 } },
  push: { enabled: true, strength: 0.18, spin: 0.5, spring: { type: 'spring', visualDuration: 0.5, bounce: 0.3 } },
};

// 1.5× Figma size: the fanned ribbon is ~1450 px wide, 75% of the stage
const CARD_SCALE = 1.5;

export default function FilmRibbon() {
  const middle = (CARDS.length - 1) / 2;
  const appearOrder = CARDS.map((_, i) => i).sort((a, b) => Math.abs(b - middle) - Math.abs(a - middle) || a - b);
  const [settled, setSettled] = useState(() => new Set());

  return (
    <IntroDone.Provider value={settled.size === CARDS.length}>
      <div className="ribbon" style={{ '--card-scale': CARD_SCALE }}>
        {CARDS.map((Content, i) => (
          <Card
            key={i}
            offset={i - middle}
            appearIndex={appearOrder.indexOf(i)}
            count={CARDS.length}
            fan={DIALS.fan}
            hover={DIALS.hover}
            intro={DIALS.intro}
            push={DIALS.push}
            onIntroDone={() => setSettled((done) => new Set(done).add(i))}
          >
            <Content />
          </Card>
        ))}
      </div>
    </IntroDone.Provider>
  );
}
