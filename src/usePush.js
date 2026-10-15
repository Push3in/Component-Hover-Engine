import { useEffect, useRef } from 'react';
import { animate, useMotionValue } from 'motion/react';

const MAX_SPEED = 2400; // px/s — cap on how fast a push can send the card
const MAX_SPIN = 360;   // deg/s — cap on how fast a push can spin the card
const MAX_GAP = 0.12;   // s — pointer moves further apart than this don't push (pointer paused)

// Does the segment a→b pass through rect r? (Liang–Barsky clipping)
function segmentHitsRect(a, b, r) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  let t0 = 0;
  let t1 = 1;
  for (const [p, q] of [[-dx, a.x - r.left], [dx, r.right - a.x], [-dy, a.y - r.top], [dy, r.bottom - a.y]]) {
    if (p === 0) {
      if (q < 0) return false;
      continue;
    }
    const t = q / p;
    if (p < 0) {
      if (t > t1) return false;
      t0 = Math.max(t0, t);
    } else {
      if (t < t0) return false;
      t1 = Math.min(t1, t);
    }
  }
  return true;
}

// Motion ignores `velocity` on a duration-based spring (visualDuration/bounce) when
// start and end are equal, so a kick from 0 back to 0 wouldn't move. Convert to a
// physics spring (stiffness/damping), using the same formula as Motion and DialKit.
function toPhysicsSpring(spring) {
  if (spring.stiffness !== undefined || spring.damping !== undefined || spring.mass !== undefined) {
    return spring;
  }
  const visualDuration = Math.max(0.05, spring.visualDuration ?? 0.3);
  const bounce = spring.bounce ?? 0.3;
  const root = (2 * Math.PI) / (visualDuration * 1.2);
  const stiffness = root * root;
  const damping = 2 * Math.min(1, Math.max(0.05, 1 - bounce)) * Math.sqrt(stiffness);
  return { type: 'spring', stiffness, damping, mass: 1 };
}

function capVector(x, y, max) {
  const scale = Math.min(1, max / Math.max(1, Math.hypot(x, y)));
  return [x * scale, y * scale];
}

// The pointer pushes the card: a swipe through it kicks the card in the swipe's
// direction (harder for faster swipes) and spins it depending on how far off-centre
// it was hit. The card then springs back to its resting position.
// Returns motion values for the card's x, y and rotate.
// Note: always pushes, even when the system "Reduce motion" setting is on.
export default function usePush(cardRef, { enabled, strength, spin, spring }) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);

  // Latest settings, read inside the window listener without re-attaching it
  const settings = useRef();
  settings.current = { enabled, strength, spin, spring };

  useEffect(() => {
    let last = null;

    function handlePointerMove(e) {
      const now = { x: e.clientX, y: e.clientY, time: e.timeStamp };
      const prev = last;
      last = now;

      const { enabled, strength, spin, spring } = settings.current;
      const card = cardRef.current;
      if (!enabled || !card || !prev || e.pointerType === 'touch') return;

      const dt = (now.time - prev.time) / 1000;
      if (dt <= 0 || dt > MAX_GAP) return;

      const rect = card.getBoundingClientRect();
      if (!segmentHitsRect(prev, now, rect)) return;

      // Pointer velocity (px/s)
      const dx = now.x - prev.x;
      const dy = now.y - prev.y;
      const length = Math.hypot(dx, dy);
      const speed = length / dt;

      // Spin: where along the card the swipe passed, relative to its centre.
      // Uses the point on the swipe closest to the centre; -1…1, off-centre spins more.
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const t = Math.max(0, Math.min(1, ((cx - prev.x) * dx + (cy - prev.y) * dy) / (length * length)));
      const rx = prev.x + t * dx - cx;
      const ry = prev.y + t * dy - cy;
      const torque = (rx * dy - ry * dx) / (length * (Math.max(rect.width, rect.height) / 2));

      // Add the push to whatever motion the card already has, then spring home
      const [vx, vy] = capVector(
        x.getVelocity() + (dx / dt) * strength,
        y.getVelocity() + (dy / dt) * strength,
        MAX_SPEED
      );
      const vr = Math.max(-MAX_SPIN, Math.min(MAX_SPIN,
        rotate.getVelocity() + torque * speed * strength * spin * 0.2
      ));

      const home = toPhysicsSpring(spring);
      animate(x, 0, { ...home, velocity: vx });
      animate(y, 0, { ...home, velocity: vy });
      animate(rotate, 0, { ...home, velocity: vr });
    }

    function handlePointerOut(e) {
      // Pointer left the window
      if (!e.relatedTarget) last = null;
    }

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerout', handlePointerOut);
    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerout', handlePointerOut);
    };
  }, [cardRef, x, y, rotate]);

  return { x, y, rotate };
}
