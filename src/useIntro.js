import { useLayoutEffect, useRef } from 'react';
import { animate, useMotionValue } from 'motion/react';

// Page-load intro for one card. The cards pop into a pile in the middle of the
// ribbon one by one (outer cards first, the middle card last, on top), upright,
// then all spring out to their spots in the fan.
//
// The slot (the card's fan position) is already moved down the curve and tilted
// by CSS. This layer sits inside it and starts with the opposite move and tilt,
// so the card begins at the ribbon's centre, level. Animating them back to 0
// lets the slot's own fan transform take over.
//
// `angle` is the slot's tilt in degrees. `appearIndex` is when it pops into the
// pile (0 = first) out of `count` cards, and `order` how far it is from the
// middle card (0, 1, 2…) so the outer cards leave a beat later. `onDone` is
// called once the card has settled in its spot.
export default function useIntro(slotRef, angle, { appearIndex, count, order }, intro, onDone) {
  const ref = useRef(null); // the intro layer itself
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotate = useMotionValue(0);
  const scale = useMotionValue(intro.scale * intro.popFrom);
  const opacity = useMotionValue(0);

  // Runs once, after layout but before the first paint
  useLayoutEffect(() => {
    const slot = slotRef.current;
    const ribbon = slot.parentElement.getBoundingClientRect();
    const box = slot.getBoundingClientRect();
    // How far the slot's centre is from the ribbon's centre, on screen
    const dx = ribbon.left + ribbon.width / 2 - (box.left + box.width / 2);
    const dy = ribbon.top + ribbon.height / 2 - (box.top + box.height / 2);
    // This layer moves inside the slot's tilted frame, so turn the screen
    // distance into that frame before using it
    const a = (angle * Math.PI) / 180;
    x.set(dx * Math.cos(a) + dy * Math.sin(a));
    y.set(-dx * Math.sin(a) + dy * Math.cos(a));
    rotate.set(-angle);

    // Motion only writes motion values to the page on its next animation frame,
    // which comes after the first paint, so the finished fan flashed for a
    // frame. Write the starting pose straight onto the element now so the very
    // first paint already shows the hidden pile; Motion takes over from here.
    ref.current.style.opacity = '0';
    ref.current.style.transform =
      `translateX(${x.get()}px) translateY(${y.get()}px) rotate(${-angle}deg) scale(${scale.get()})`;

    // Timeline, in seconds from page load
    const appearAt = intro.delay + appearIndex * intro.appearStagger;
    const spreadAt = intro.delay + (count - 1) * intro.appearStagger + intro.hold + order * intro.stagger;
    const startedAt = performance.now();

    let cancelled = false;
    let running = [];
    const run = (animation) => {
      running.push(animation);
      return animation.finished;
    };

    async function play() {
      // 1. Pop into the pile: fade in and spring up to pile size
      const spreadMove = { ...intro.spring, delay: spreadAt };
      const popIn = run(animate(scale, intro.scale, { ...intro.appearSpring, delay: appearAt }));
      await Promise.all([
        run(animate(opacity, 1, { duration: 0.15, delay: appearAt })),
        popIn,
        // 2. Spread out: position and tilt are only waiting on the clock
        run(animate(x, 0, spreadMove)),
        run(animate(y, 0, spreadMove)),
        run(animate(rotate, 0, spreadMove)),
        // Size has to wait for the pop-in to finish first, so it's started
        // once that's done (below)
        (async () => {
          await popIn;
          if (cancelled) return;
          const left = spreadAt - (performance.now() - startedAt) / 1000;
          await run(animate(scale, 1, { ...intro.spring, delay: Math.max(0, left) }));
        })(),
      ]);
      if (!cancelled) onDone?.();
    }
    play();

    return () => {
      cancelled = true;
      running.forEach((animation) => animation.stop());
      running = [];
    };
    // Page load only: later dial changes shouldn't replay it
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { ref, style: { x, y, rotate, scale, opacity } };
}
