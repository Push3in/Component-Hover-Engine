import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useTransform } from 'motion/react';
import { statusLoop } from './statusLoop.js';

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP'];

// Each month's bar, top to bottom: light, mid, dark share in %. The Figma values
// (segment heights out of the 119.5px bar).
const FIGMA = [
  [12.54, 38.358, 68.602],
  [20.654, 72.29, 26.556],
  [32.457, 41.309, 45.735],
  [53.111, 35.407, 30.981],
  [33.194, 52.373, 33.932],
  [28.769, 70.815, 19.917],
  [40.571, 58.275, 20.654],
  [59.012, 33.932, 26.556],
  [35.407, 28.769, 55.324],
].map((month) => month.map((h) => (h / 119.5) * 100));

const SEGMENTS = ['light', 'mid', 'dark'];

const EASE_IN_OUT = [0.65, 0, 0.35, 1];

// The grey placeholders and month names are always there. The coloured bars
// follow the Sleep (Status) card's loop like an echo, a beat behind it both
// ways: shortly after Sleep starts building in, each bar's whole stack slides
// up from the bottom into its placeholder, one month after another (JAN → SEP);
// shortly after Sleep starts clearing away, they slide back down (SEP → JAN) at
// their own pace. So Sleep finishes and starts over first, and the bars follow.
// The bar crops anything below it.
const FILL = {
  start: 0.2,                 // seconds after Sleep starts building in
  stagger: 0.02,              // gap between months
  motion: { duration: 0.9, ease: EASE_IN_OUT },
};

const DRAIN = {
  start: 0.2,                 // seconds after Sleep starts clearing away
  stagger: 0.015,
  motion: { duration: 0.75, ease: EASE_IN_OUT },
};

const LAST = MONTHS.length - 1;

// Full while the Sleep card is built in, empty while it's cleared
function useFollowStatus() {
  const [full, setFull] = useState(statusLoop.shown);
  useEffect(() => statusLoop.on(setFull), []);
  return full;
}

// One month's bar. `level` (0–100, how far the stack has risen) moves the
// whole stack up.
function Bar({ shares, month, full }) {
  const level = useMotionValue(0);
  const y = useTransform(level, (v) => `${100 - v}%`);

  useEffect(() => {
    const animation = full
      ? animate(level, 100, { ...FILL.motion, delay: FILL.start + month * FILL.stagger })
      : animate(level, 0, { ...DRAIN.motion, delay: DRAIN.start + (LAST - month) * DRAIN.stagger });
    return () => animation.stop();
  }, [full, month, level]);

  return (
    <div className="audience-bar">
      <motion.div className="audience-fill" style={{ y }}>
        {SEGMENTS.map((name, k) => (
          <span key={name} className={`audience-${name}`} style={{ height: `${shares[k]}%` }} />
        ))}
      </motion.div>
    </div>
  );
}

// Figma: Components / C4 - Audience (35:87)
export default function AudienceCard() {
  const full = useFollowStatus();

  return (
    <div className="tile audience">
      <div className="split audience-head">
        <p className="muted small">Audience</p>
        <p className="audience-headline">
          <span className="semibold">48%</span>
          <span className="muted small">Positive</span>
        </p>
      </div>

      <div className="audience-chart">
        {MONTHS.map((label, m) => (
          <div key={label} className="audience-month">
            <Bar shares={FIGMA[m]} month={m} full={full} />
            <span className="audience-label">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
