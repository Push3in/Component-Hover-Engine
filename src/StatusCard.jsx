import { useContext, useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import arrowUp from './assets/arrow-up.svg';
import knob from './assets/status-knob.svg';
import { IntroDone } from './introContext.js';

// Heatmap intensity per cell, 0 (lightest) to 3 (darkest) — see .heat-* in style.css
const HEATMAP = [
  [3, 0, 0, 1],
  [0, 1, 2, 0],
  [0, 2, 0, 3],
];

// Intro: every piece springs up into place, one after another, top to bottom.
// The card shows its contents while the cards spread out into the fan on page
// load. Once they've all settled it builds in, then loops on its own:
// hold → clear away (bottom first) → build in → repeat.
const INTRO = {
  start: 0.1,       // seconds before the first piece appears
  step: 0.08,       // gap between each text piece
  cellStep: 0.025,  // gap between heatmap cells (quicker, there are 12)
  spring: { type: 'spring', visualDuration: 0.5, bounce: 0.35 },
};

const LOOP = {
  hold: 3,          // seconds the finished card stays up
  outSpeed: 0.5,    // clearing away runs at this fraction of the build-in gaps
  gap: 0.6,         // seconds the card stays empty before building in again
  outSpring: { type: 'spring', visualDuration: 0.3, bounce: 0 },
};

// Running order (the slot each piece appears in)
const ORDER = {
  title: 0,
  description: 1,
  comments: 2,
  badge: 3,
  heatmap: 4,        // first cell; the rest follow at cellStep
  track: 5,
  knob: 6,
  less: 7,
  more: 8,
};
const HEATMAP_TIME = HEATMAP.flat().length * INTRO.cellStep;

function delayFor(slot, cell = 0) {
  // Everything after the heatmap waits for all of its cells to start
  const afterHeatmap = slot > ORDER.heatmap ? HEATMAP_TIME : 0;
  return INTRO.start + slot * INTRO.step + cell * INTRO.cellStep + afterHeatmap;
}

// When the last piece starts appearing (the knob's label, "more positive")
const LAST_DELAY = delayFor(ORDER.more);
// One full build-in, from the first piece starting to the last one settling
const IN_TIME = LAST_DELAY + INTRO.spring.visualDuration;
const OUT_TIME = (LAST_DELAY - INTRO.start) * LOOP.outSpeed + LOOP.outSpring.visualDuration;

const HIDDEN = { opacity: 0, y: '0.6em', scale: 0.8 };
const SHOWN = { opacity: 1, y: 0, scale: 1 };

// Starts shown. As soon as the cards have settled into the fan, the pieces
// vanish in one frame (no clear-away the first time) and build in straight
// away. After that it flips between shown and hidden forever, timed so each
// phase can finish. `instant` is true only for that first vanish.
function useLoop(hold) {
  const ready = useContext(IntroDone);
  const [shown, setShown] = useState(true);
  const [instant, setInstant] = useState(false);
  const started = useRef(false);

  useEffect(() => {
    if (!ready) return;

    if (!started.current) {
      if (shown) {
        setInstant(true);
        setShown(false);
        return;
      }
      // Hidden now; give the browser two frames to draw that before building in
      let second;
      const first = requestAnimationFrame(() => {
        second = requestAnimationFrame(() => {
          started.current = true;
          setInstant(false);
          setShown(true);
        });
      });
      return () => {
        cancelAnimationFrame(first);
        cancelAnimationFrame(second);
      };
    }

    const wait = shown ? IN_TIME + hold : OUT_TIME + LOOP.gap;
    const timer = setTimeout(() => setShown((s) => !s), wait * 1000);
    return () => clearTimeout(timer);
  }, [ready, shown, hold]);

  return { shown, instant };
}

// One piece of the intro: starts small, low and see-through, springs to rest.
// Going away it runs the order backwards, quicker and without bounce.
function Pop({ as = 'span', loop, slot, cell, className, children }) {
  const Tag = motion[as];
  const delay = delayFor(slot, cell);
  const transition = loop.instant
    ? { duration: 0 }
    : loop.shown
      ? { ...INTRO.spring, delay }
      : { ...LOOP.outSpring, delay: (LAST_DELAY - delay) * LOOP.outSpeed };

  return (
    <Tag
      className={className}
      initial={false}
      animate={loop.shown ? SHOWN : HIDDEN}
      transition={transition}
    >
      {children}
    </Tag>
  );
}

// Figma: Component-Testing / C3 - Status (1:60)
// `hold`: seconds the built card stays up before clearing away (films set it longer)
export default function StatusCard({ hold = LOOP.hold }) {
  const loop = useLoop(hold);

  return (
    <div className="tile status">
      <div className="split muted small">
        <Pop loop={loop} slot={ORDER.title}>Sleep</Pop>
        <Pop loop={loop} slot={ORDER.description}>sleep pattern of two weeks</Pop>
      </div>

      <div className="status-title">
        <Pop loop={loop} as="p" slot={ORDER.comments} className="strong">9 Comments</Pop>
        <Pop loop={loop} slot={ORDER.badge} className="badge">
          <img src={arrowUp} alt="" />
          <span>10%</span>
        </Pop>
      </div>

      <div className="heatmap">
        {HEATMAP.flat().map((level, i) => (
          <Pop loop={loop} key={i} slot={ORDER.heatmap} cell={i} className={`heat-${level}`} />
        ))}
      </div>

      <div className="scale">
        <Pop loop={loop} as="div" slot={ORDER.track} className="scale-track status-track">
          <Pop loop={loop} slot={ORDER.knob} className="knob status-knob">
            <img src={knob} alt="" />
          </Pop>
        </Pop>
        <div className="split muted tiny">
          <Pop loop={loop} slot={ORDER.less}>less</Pop>
          <Pop loop={loop} slot={ORDER.more}>more positive</Pop>
        </div>
      </div>
    </div>
  );
}
