// A tiny "film as code" test, in the spirit of Emil Widlund's pipeline:
// - the film is one GSAP timeline built from a storyboard (plain data)
// - each scene builds plain DOM and animates it
// - the preview is scrubbable to any frame
// - render.mjs steps window.film.seek(t) frame by frame and hands frames to ffmpeg
import gsap from 'gsap';

// Brand easing: use the same curves everywhere, like the cards' own motion
const EASE = { in: 'expo.out', out: 'power3.in', move: 'power3.inOut' };

// ── Storyboard: a few lines of data per scene ──────────────────────────────
const STORYBOARD = [
  { scene: 'count', verb: 'Count it', note: 'Numbers tick up as the card lands', from: 0, to: 9831, hold: 2.2 },
  { scene: 'slide', verb: 'Drag it', note: 'A knob eases across the track', from: 0.15, to: 0.85, hold: 2.4 },
  { scene: 'count', verb: 'Price it', note: 'Change one line, re-render', from: 9831, to: 7250, hold: 2.2 },
];

const stage = document.getElementById('stage');
const fmt = (n) => Math.round(n).toLocaleString('en-US');

// ── Scenes: build DOM, return a timeline ───────────────────────────────────
function caption(verb, note) {
  const el = document.createElement('div');
  el.className = 'caption';
  el.innerHTML = `<b>${verb}</b><span>${note}</span>`;
  stage.append(el);
  return el;
}

const scenes = {
  count({ verb, note, from, to, hold }) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="label">Credits used</div><div class="big">${fmt(from)}</div>`;
    stage.append(card);
    const cap = caption(verb, note);
    const big = card.querySelector('.big');
    const n = { v: from };
    return gsap.timeline()
      .fromTo(card, { y: 80, scale: 0.94, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: EASE.in })
      .fromTo(cap, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: EASE.in }, '<0.1')
      .to(n, { v: to, duration: hold * 0.6, ease: 'power2.out', onUpdate: () => (big.textContent = fmt(n.v)) }, '<0.2')
      .to(card, { scale: 1.02, duration: hold, ease: 'none' }, '<')               // slow drift: never fully still
      .to([card, cap], { y: -40, autoAlpha: 0, duration: 0.35, ease: EASE.out });
  },
  slide({ verb, note, from, to, hold }) {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `<div class="label">Audience</div><div class="big">48%</div><div class="track"><div class="knob"></div></div>`;
    stage.append(card);
    const cap = caption(verb, note);
    const knob = card.querySelector('.knob');
    const big = card.querySelector('.big');
    const p = { v: from };
    const draw = () => { knob.style.left = `${p.v * 100}%`; big.textContent = `${Math.round((1 - p.v) * 100)}%`; };
    draw();
    return gsap.timeline()
      .fromTo(card, { y: 80, scale: 0.94, autoAlpha: 0 }, { y: 0, scale: 1, autoAlpha: 1, duration: 0.9, ease: EASE.in })
      .fromTo(cap, { y: 20, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.7, ease: EASE.in }, '<0.1')
      .to(p, { v: to, duration: hold * 0.7, ease: EASE.move, onUpdate: draw }, '<0.3')
      .to(card, { scale: 1.02, duration: hold, ease: 'none' }, '<')
      .to([card, cap], { y: -40, autoAlpha: 0, duration: 0.35, ease: EASE.out });
  },
};

// ── Assemble: one master timeline, scenes overlap slightly ────────────────
const film = gsap.timeline({ paused: true });
STORYBOARD.forEach((beat, i) => film.add(scenes[beat.scene](beat), i === 0 ? 0 : '-=0.15'));

// ── Fit the 1920×1080 stage to the window ─────────────────────────────────
const fit = () => { stage.style.scale = Math.min(innerWidth / 1920, innerHeight / 1080); };
addEventListener('resize', fit); fit();

// ── Render mode (render.mjs): no controls, no autoplay, deterministic seek ──
const rendering = new URLSearchParams(location.search).has('render');
window.film = {
  duration: film.duration(),
  seek: (t) => { film.seek(t, false); return true; },
};
if (rendering) {
  document.body.classList.add('render');
  stage.style.scale = 1;
} else {
  // Preview: plays on loop, scrubbable
  const play = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const time = document.getElementById('time');
  film.eventCallback('onUpdate', () => {
    scrub.value = (film.time() / film.duration()) * 1000;
    time.textContent = `${film.time().toFixed(2)} s`;
  });
  film.eventCallback('onComplete', () => film.restart());
  play.onclick = () => { film.paused(!film.paused()); play.textContent = film.paused() ? 'Play' : 'Pause'; };
  scrub.oninput = () => { film.pause(); play.textContent = 'Play'; film.seek((scrub.value / 1000) * film.duration()); };
  film.play();
}
