import { useEffect, useState } from 'react';
import { animate, motion, useMotionValue, useMotionValueEvent, useTransform } from 'motion/react';
import knob from './assets/audience-knob.svg';
import trendPositive from './assets/trend-positive.svg';
import trendNeutral from './assets/trend-neutral.svg';
import trendNegative from './assets/trend-negative.svg';

// Where the knob sits in the Figma design (0 = Good end, 1 = Bad end):
// 68px left of centre on the 202px track
const FIGMA_SPOT = (101 - 68) / 202;

// Shares as the knob moves (0 = Good end, 1 = Bad end). Neutral swells gently
// towards the middle; the rest is split between Positive and Negative in
// proportion to where the knob is. Every number moves steadily whenever the
// knob moves, so they always read as following it.
const NEUTRAL = { ends: 12, middle: 32 }; // % at the two ends, and at the centre

// The "hand" dragging the knob around on its own. An ease-in-out (not a spring)
// so it moves at an even, hand-like pace, without a long slow tail at the end
// where the knob looks still but the numbers are still ticking.
const DRAG = {
  range: [0.06, 0.94],   // how close to the ends it goes
  minMove: 0.15,         // each drag travels at least this far
  pause: [0.6, 1.6],     // seconds it rests between drags (random in this range)
  speed: 16,             // seconds to cross the whole track (quarter of the old 4s pace); shorter drags take less
  ease: [0.45, 0, 0.55, 1],
};

const LABELS = ['Positive', 'Neutral', 'Negative'];
const TRENDS = [trendPositive, trendNeutral, trendNegative];

// Shares (whole percents adding up to 100) for a knob position
function mixAt(p) {
  const neutral = NEUTRAL.ends + (NEUTRAL.middle - NEUTRAL.ends) * Math.sin(Math.PI * p);
  const rest = 100 - neutral;
  const positive = Math.round(rest * (1 - p));
  const negative = Math.round(rest * p);
  return [positive, 100 - positive - negative, negative];
}

const random = (min, max) => min + Math.random() * (max - min);

// Moves `position` to a new random spot, rests, and repeats, forever
function useAutoDrag(position) {
  useEffect(() => {
    let animation;
    let timer;
    let stopped = false;

    function dragAgain() {
      const now = position.get();
      let target;
      do target = random(...DRAG.range);
      while (Math.abs(target - now) < DRAG.minMove);
      animation = animate(position, target, {
        duration: Math.abs(target - now) * DRAG.speed,
        ease: DRAG.ease,
      });
      animation.finished.then(() => {
        if (!stopped) timer = setTimeout(dragAgain, random(...DRAG.pause) * 1000);
      });
    }

    timer = setTimeout(dragAgain, random(...DRAG.pause) * 1000);
    return () => {
      stopped = true;
      clearTimeout(timer);
      animation?.stop();
    };
  }, [position]);
}

// Figma: Component-Testing / C4 - Audience (12:41)
export default function AudienceCard() {
  const position = useMotionValue(FIGMA_SPOT);
  const [mix, setMix] = useState(() => mixAt(FIGMA_SPOT));
  useAutoDrag(position);

  // Only re-render when a whole percent actually changes
  useMotionValueEvent(position, 'change', (p) => {
    const next = mixAt(p);
    setMix((current) => (current.every((v, k) => v === next[k]) ? current : next));
  });

  // Slides the knob's rail with a transform, so it moves by fractions of a pixel
  const railX = useTransform(position, (p) => `${p * 100}%`);

  // Headline shows whichever share is biggest right now
  const lead = mix.indexOf(Math.max(...mix));

  return (
    <div className="tile audience">
      <div className="audience-summary">
        <p className="muted small">Audience</p>
        <p className="audience-headline">
          <span className="strong">{mix[lead]}%</span>
          <span className="muted small">{LABELS[lead]}</span>
        </p>
      </div>

      <div className="scale">
        <div className="scale-track audience-track">
          <motion.span className="knob-rail" style={{ x: railX }}>
            <span className="knob audience-knob">
              <img src={knob} alt="" />
            </span>
          </motion.span>
        </div>
        <div className="split muted tiny">
          <span>Good</span>
          <span>Bad</span>
        </div>
      </div>

      <div className="split">
        {LABELS.map((label, k) => (
          <div key={label} className="audience-stat">
            <p className="muted small">{label}</p>
            <p className="audience-value">
              <span>{mix[k]}%</span>
              <img className={`trend-${label.toLowerCase()}`} src={TRENDS[k]} alt="" />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
