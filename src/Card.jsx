import { useRef, useState } from 'react';
import { motion } from 'motion/react';
import usePush from './usePush.js';

// One slot in the ribbon: grows while hovered and gets pushed by the pointer.
// The card's own design is passed in as children.
// `offset` is the distance from the middle card (…-2, -1, 0, 1, 2…), used to fan
// the cards out along a curve.
export default function Card({ offset, fan, hover, push, children }) {
  const ref = useRef(null);
  const [hovered, setHovered] = useState(false);
  const { x, y, rotate } = usePush(ref, push);

  return (
    // The slot holds the fan position, so pushes and hover happen on top of it
    <div
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
    </div>
  );
}
