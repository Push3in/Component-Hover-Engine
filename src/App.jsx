import { useRef, useState } from 'react';
import { DialRoot, useDialKit } from 'dialkit';
import WeatherCard from './WeatherCard.jsx';
import usePush from './usePush.js';

export default function App() {
  const dials = useDialKit('Card', {
    // Scale relative to the Figma frame (198px wide); 2× is the default
    scale: [2, 1, 4, 0.1],
    // Outline the containers to inspect layout
    skeleton: false,
    hover: {
      scale: [1.2, 1, 2, 0.05],
      // Spring for growing / shrinking
      spring: { type: 'spring', visualDuration: 0.3, bounce: 0.2 },
    },
    push: {
      enabled: true,
      // How much of the pointer's speed is passed on to the card
      strength: [0.1, 0, 1, 0.01],
      // How much off-centre swipes spin the card
      spin: [0.5, 0, 2, 0.05],
      // Spring that brings the card back home after a push
      spring: { type: 'spring', visualDuration: 0.5, bounce: 0.3 },
    },
  });

  // Pointer is inside the container: the card grows
  const [active, setActive] = useState(false);
  const cardRef = useRef(null);
  const { x, y, rotate } = usePush(cardRef, dials.push);

  return (
    <>
      <main
        className={dials.skeleton ? 'container skeleton' : 'container'}
        onPointerEnter={() => setActive(true)}
        onPointerLeave={() => setActive(false)}
      >
        <div className="ribbon" style={{ '--card-width': `${198 * dials.scale}px` }}>
          <WeatherCard
            ref={cardRef}
            x={x}
            y={y}
            rotate={rotate}
            scale={active ? dials.hover.scale : 1}
            transition={dials.hover.spring}
          />
        </div>
      </main>
      <DialRoot />
    </>
  );
}
