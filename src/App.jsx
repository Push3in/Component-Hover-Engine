import { DialRoot, useDialKit } from 'dialkit';
import Card from './Card.jsx';
import useFitScale from './useFitScale.js';
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
    maxScale: [1.2, 0.5, 3, 0.05],
    // Outline the containers to inspect layout
    skeleton: false,
    fan: {
      // How far each card slides under its neighbour (Figma px)
      overlap: [60, 0, 200, 1],
      // Tilt per step away from the middle card (degrees)
      angle: [6, 0, 20, 0.5],
      // How far the outer cards drop to follow the curve (Figma px per step²)
      curve: [12, 0, 60, 1],
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

  return (
    <>
      <main className={dials.skeleton ? 'container skeleton' : 'container'}>
        <div className="ribbon" style={{ '--card-scale': scale }}>
          {CARDS.map(({ Content }, i) => (
            <Card
              key={i}
              offset={i - middle}
              fan={dials.fan}
              hover={dials.hover}
              push={dials.push}
            >
              <Content />
            </Card>
          ))}
        </div>
      </main>
      <DialRoot />
    </>
  );
}
