import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import dotBlue from './assets/calendar-dot-blue.svg';
import dotPink from './assets/calendar-dot-pink.svg';
import dotGreen from './assets/calendar-dot-green.svg';
import { statusLoop } from './statusLoop.js';
import '@fontsource/geist-mono/600.css'; // the day numbers (bundled, so it works on any machine)

// Marked days and their circles, as in Figma (06 pink, 09 blue, 25 green)
const MARKED = { 6: dotPink, 9: dotBlue, 25: dotGreen };

// The calendar loops in step with the others, one beat behind the Audience card
// (which is one beat behind Sleep): Sleep → Audience → Calendar, both ways.
const FOLLOW = 0.4; // seconds after Sleep starts building in / clearing away

// Building in: the month name and "CURRENT" rise into place, then the days
// 01 → last one after another (same spring as the Sleep card's text), then the
// circles pop in on the marked days.
const BUILD = {
  monthStart: 0,
  labelStart: 0.05, // "CURRENT", just after the month name
  dayStart: 0.1,
  dayStep: 0.02,
  spring: { type: 'spring', visualDuration: 0.5, bounce: 0.35 },
};

// Clearing away: the reverse, quicker and without bounce (circles, then the
// days last → 01, then the month name and "CURRENT")
const CLEAR = {
  dayStep: 0.008,
  spring: { type: 'spring', visualDuration: 0.3, bounce: 0 },
};

const POP = {
  step: 0.12, // gap between circles
  in: { type: 'spring', visualDuration: 0.45, bounce: 0.4 },
  out: { type: 'spring', visualDuration: 0.25, bounce: 0 },
};

const HIDDEN = { opacity: 0, y: '0.6em' };
const SHOWN = { opacity: 1, y: 0 };

// Built in while the Sleep card is (a beat later), cleared while it's cleared
function useFollowStatus() {
  const [shown, setShown] = useState(statusLoop.shown);
  useEffect(() => statusLoop.on(setShown), []);
  return shown;
}

// Props for one rising piece: `inDelay` / `outDelay` are seconds after FOLLOW
function rise(shown, inDelay, outDelay) {
  return {
    initial: false,
    animate: shown ? SHOWN : HIDDEN,
    transition: shown
      ? { ...BUILD.spring, delay: FOLLOW + inDelay }
      : { ...CLEAR.spring, delay: FOLLOW + outDelay },
  };
}

// Figma: Components / C5 - Calendar (39:188)
// Shows the current month: its name and every day in a 7-column grid.
export default function CalendarCard() {
  const shown = useFollowStatus();
  const today = new Date();
  const month = today.toLocaleString('en-US', { month: 'long' });
  const days = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const marked = Object.keys(MARKED).map(Number);

  // Circles pop in once the last day has started rising, and go first when clearing
  const popIn = BUILD.dayStart + days * BUILD.dayStep + 0.1;
  const daysOut = marked.length * 0.05;            // days start leaving after the circles
  const monthOut = daysOut + days * CLEAR.dayStep; // the month leaves last

  return (
    <div className="tile calendar">
      <div className="split calendar-head">
        <motion.p className="semibold" {...rise(shown, BUILD.monthStart, monthOut)}>{month}</motion.p>
        <motion.p className="muted small" {...rise(shown, BUILD.labelStart, monthOut)}>CURRENT</motion.p>
      </div>

      <div className="calendar-grid">
        {Array.from({ length: days }, (_, i) => {
          const day = i + 1;
          const order = marked.indexOf(day);
          return (
            <motion.span
              key={day}
              className="calendar-day"
              {...rise(shown, BUILD.dayStart + i * BUILD.dayStep, daysOut + (days - 1 - i) * CLEAR.dayStep)}
            >
              {MARKED[day] && (
                <motion.img
                  className="calendar-dot"
                  src={MARKED[day]}
                  alt=""
                  initial={false}
                  animate={shown ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
                  transition={shown
                    ? { ...POP.in, delay: FOLLOW + popIn + order * POP.step }
                    : { ...POP.out, delay: FOLLOW + (marked.length - 1 - order) * 0.05 }}
                />
              )}
              {String(day).padStart(2, '0')}
            </motion.span>
          );
        })}
      </div>
    </div>
  );
}
