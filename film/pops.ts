// Stickers that pop onto a card while it's hovered: little badges that spring in
// one after another, hang on, then shrink away. They're attached to the card
// itself, so they ride along with its hover growth and the camera.
import gsap from 'gsap';

export type Glyph = 'check' | 'bolt' | 'heart' | 'note' | 'star' | 'plus';
export type Shape = 'circle' | 'hex' | 'square';

export interface Pop {
  glyph: Glyph;
  /** Badge fill colour */
  color: string;
  shape?: Shape;
  /** Position on the card: 0–1 across its width / height (can go past the edges) */
  x: number;
  y: number;
  /** Diameter in em (1em = 16 Figma px × card scale, so it grows with the card) */
  size?: number;
  /** Resting tilt in degrees */
  tilt?: number;
}

const GLYPHS: Record<Glyph, string> = {
  check: '<path d="M7 12.5l3.2 3.2L17 9" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>',
  bolt: '<path d="M13.2 4.5L7.5 13h4l-1 6.5L16.5 11h-4z" fill="#fff"/>',
  heart: '<path d="M12 18.5s-6-3.6-6-8a3.3 3.3 0 0 1 6-1.9 3.3 3.3 0 0 1 6 1.9c0 4.4-6 8-6 8z" fill="#fff"/>',
  note: '<path d="M10 16.5V7.2l7-1.6v9" fill="none" stroke="#fff" stroke-width="2.2" stroke-linejoin="round"/><circle cx="8.2" cy="16.6" r="2.3" fill="#fff"/><circle cx="15.2" cy="15" r="2.3" fill="#fff"/>',
  star: '<path d="M12 5.5l2 4.2 4.6.6-3.4 3.2.9 4.5L12 15.8 7.9 18l.9-4.5-3.4-3.2 4.6-.6z" fill="#fff"/>',
  plus: '<path d="M12 7v10M7 12h10" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>',
};

const SHAPES: Record<Shape, string> = {
  circle: '<circle cx="12" cy="12" r="11"/>',
  hex: '<path d="M12 1.2l9.4 5.4v10.8L12 22.8l-9.4-5.4V6.6z" stroke-linejoin="round"/>',
  square: '<rect x="1.5" y="1.5" width="21" height="21" rx="6.5"/>',
};

function badge(pop: Pop): HTMLElement {
  const el = document.createElement('div');
  el.className = 'film-pop';
  el.style.left = `${pop.x * 100}%`;
  el.style.top = `${pop.y * 100}%`;
  el.style.fontSize = `${pop.size ?? 2.2}em`;
  el.innerHTML =
    `<svg viewBox="0 0 24 24"><g fill="${pop.color}" stroke="#fff" stroke-width="1.6">${SHAPES[pop.shape ?? 'circle']}</g>` +
    `${GLYPHS[pop.glyph]}</svg>`;
  return el;
}

/**
 * Add a set of pops to the timeline. `card` is the card's outer element (.card).
 * They spring in from `at`, staggered, and leave at `at + hold`.
 */
export function addPops(tl: gsap.core.Timeline, card: HTMLElement, pops: Pop[], at: number, hold: number): void {
  card.classList.add('film-pop-host');
  const els = pops.map((pop) => {
    const el = badge(pop);
    card.append(el);
    gsap.set(el, { xPercent: -50, yPercent: -50, scale: 0, rotate: (pop.tilt ?? 0) - 40, autoAlpha: 0 });
    return el;
  });
  tl.to(els, {
    scale: 1, autoAlpha: 1, rotate: (i: number) => pops[i].tilt ?? 0,
    duration: 0.55, ease: 'back.out(2.4)', stagger: 0.07,
  }, at);
  tl.to(els, {
    scale: 0, autoAlpha: 0, duration: 0.22, ease: 'power3.in', stagger: { each: 0.04, from: 'end' },
  }, at + hold);
}
