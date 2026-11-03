import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import usePush from './usePush.js';
import useIntro from './useIntro.js';

// One slot in the ribbon: grows while hovered and gets pushed by the pointer.
// The card's own design is passed in as children.
// `offset` is the distance from the middle card (…-2, -1, 0, 1, 2…), used to fan
// the cards out along a curve.
export default function Card({ offset, appearIndex, count, fan, hover, push, intro, onIntroDone, children }) {
  const ref = useRef(null);
  const slotRef = useRef(null);
  const [hovered, setHovered] = useState(false);
  const { x, y, rotate } = usePush(ref, push);
  const introLayer = useIntro(
    slotRef,
    offset * fan.angle,
    { appearIndex, count, order: Math.abs(offset) },
    intro,
    onIntroDone
  );

  return (
    // The slot holds the fan position, so pushes and hover happen on top of it
    <div
      ref={slotRef}
      className="slot"
      style={{
        '--offset': offset,
        '--fan-angle': fan.angle,
        '--fan-curve': fan.curve,
        '--fan-overlap': fan.overlap,
        // Middle card on top, the rest stacked outwards
        zIndex: 50 - Math.abs(offset),
      }}
      onPointerEnter={() => setHovered(true)}
      onPointerLeave={() => setHovered(false)}
    >
      {/* Intro layer: starts every card stacked in the middle of the ribbon, then
          springs it out to its fan spot on page load (see useIntro.js) */}
      <motion.div ref={introLayer.ref} className="intro" style={introLayer.style}>
      <motion.div
        ref={ref}
        className="card"
        // x / y / rotate are pushed by the pointer (see usePush.js).
        // Size is a multiplier (not a transform), so the card really resizes and
        // its neighbours make room — see .card in style.css
        style={{ '--hover-scale': 1, x, y, rotate }}
        animate={{ '--hover-scale': hovered ? hover.scale : 1 }}
        transition={hover.spring}
      >
        {children}
      </motion.div>
      </motion.div>
    </div>
  );
}
