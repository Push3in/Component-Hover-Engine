import { useEffect, useRef, useState } from 'react';

// Plays a fake track of `duration` seconds on a loop, in real time, and can be
// paused and resumed.
// Returns the whole seconds played (for the time labels), whether it's playing,
// a toggle for the play button, and a ref to put on the progress track: every
// frame it sets `--progress` (0–1) on that element, so the dot and the fill
// glide smoothly without re-rendering React 60 times a second.
export default function usePlayback(duration) {
  const trackRef = useRef(null);
  const elapsedRef = useRef(0); // survives pauses, so resume picks up where it left off
  const [seconds, setSeconds] = useState(0);
  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    if (!playing) return;
    let last = performance.now();
    let frame;

    function tick(now) {
      // Cap each step so coming back to a hidden tab doesn't jump ahead
      const step = Math.min(now - last, 100) / 1000;
      last = now;
      elapsedRef.current = (elapsedRef.current + step) % duration;
      trackRef.current?.style.setProperty('--progress', elapsedRef.current / duration);
      setSeconds(Math.floor(elapsedRef.current)); // React skips the render when unchanged
      frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, playing]);

  const toggle = () => setPlaying((p) => !p);

  return { seconds, playing, toggle, trackRef };
}
