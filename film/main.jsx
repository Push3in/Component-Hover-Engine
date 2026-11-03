// The film's clock must load before React, Motion and the cards
import { clock } from './clock.js';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import '../src/style.css';
import './film.css';
import FilmRibbon from './FilmRibbon.jsx';
import { FILM } from './storyboard.js';

const params = new URLSearchParams(location.search);
const rendering = params.has('render');
const startAt = Number(params.get('t')) || 0;

const stage = document.getElementById('stage');
const world = document.getElementById('world');
const overlay = document.getElementById('overlay');
import { createPointer } from './pointer.js';
const pointer = createPointer(overlay);

// ── Camera and cursor state (world = the page under the camera, 1920×1080) ──
const cam = { x: 960, y: 540, zoom: 1 };
const cur = { x: -200, y: 1300, visible: false };
const toStage = (p) => ({ x: (p.x - cam.x) * cam.zoom + 960, y: (p.y - cam.y) * cam.zoom + 540 });
const toWorld = (p) => ({ x: (p.x - 960) / cam.zoom + cam.x, y: (p.y - 540) / cam.zoom + cam.y });

const NAMED = { ribbon: '.ribbon', weather: '.weather', player: '.player', status: '.status', audience: '.audience', quote: '.quote' };
function centreOf(target, dx = 0, dy = 0) {
  const el = world.querySelector(NAMED[target] || target);
  if (!el) return { x: cam.x, y: cam.y };
  const r = el.getBoundingClientRect();
  const w = world.getBoundingClientRect();
  const s = w.width / 1920; // stage scale × camera zoom
  return { x: (r.left + r.width / 2 - w.left) / s + dx / cam.zoom, y: (r.top + r.height / 2 - w.top) / s + dy / cam.zoom };
}

function apply() {
  world.style.transform = `translate(960px, 540px) scale(${cam.zoom}) translate(${-cam.x}px, ${-cam.y}px)`;
  const p = toStage(cur);
  pointer.place(p.x, p.y, cur.visible);
}

// ── Build the timeline from the storyboard ────────────────────────────────
function caption([verb, note], at, dur, tl) {
  const el = document.createElement('div');
  el.className = 'film-caption';
  el.innerHTML = `<b>${verb}</b><span>${note}</span>`;
  overlay.append(el);
  gsap.set(el, { autoAlpha: 0, y: 24 });
  tl.to(el, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'expo.out' }, at)
    .to(el, { autoAlpha: 0, y: -16, duration: 0.35, ease: 'power3.in' }, at + dur);
}
function title([line, sub], at, dur, tl) {
  const el = document.createElement('div');
  el.className = 'film-title';
  el.innerHTML = `<b>${line}</b><span>${sub}</span>`;
  overlay.append(el);
  gsap.set(el, { autoAlpha: 0, y: 30 });
  tl.to(el, { autoAlpha: 1, y: 0, duration: 0.9, ease: 'expo.out' }, at);
}

const tl = gsap.timeline({ paused: true });
for (const beat of FILM.beats) {
  const { at, dur = 1, ease = 'expo.out' } = beat;
  if (beat.camera) {
    const { on, zoom } = beat.camera;
    tl.to(cam, { x: () => centreOf(on).x, y: () => centreOf(on).y, zoom, duration: dur, ease, onUpdate: apply }, at);
  }
  if (beat.cursor) {
    const c = beat.cursor;
    const dest = () => (c.at ? toWorld({ x: c.at[0], y: c.at[1] }) : centreOf(c.to, c.dx, c.dy));
    tl.set(cur, { visible: true }, at);
    tl.to(cur, { x: () => dest().x, y: () => dest().y, duration: Math.max(dur, 0.001), ease, onUpdate: apply }, at);
  }
  if (beat.click) {
    tl.call(() => pointer.click(), [], at);
    tl.call(() => pointer.release(), [], at + 0.12);
  }
  if (beat.caption) caption(beat.caption, at, beat.for ?? 2.5, tl);
  if (beat.title) title(beat.title, at, beat.for ?? 2, tl);
}
tl.set({}, {}, FILM.duration); // pad to the full length

// Every frame: move the timeline to the clock, then lay out camera + cursor
clock.onTick((t) => { tl.time(Math.min(t, FILM.duration)); apply(); });

// ── Mount the real cards ──────────────────────────────────────────────────
const fit = () => { stage.style.scale = rendering ? 1 : Math.min(innerWidth / 1920, (innerHeight - 70) / 1080); };
addEventListener('resize', fit); fit();
await document.fonts.ready;
createRoot(world).render(<FilmRibbon />);
await clock.step(0);

// ── Render mode: render.mjs calls film.frame() once per output frame ──────
window.film = { duration: FILM.duration, fps: FILM.fps, frame: (ms) => clock.step(ms), get time() { return clock.seconds; } };
document.body.classList.toggle('render', rendering);

// ── Preview: plays in real time, pause freezes everything, scrub reloads to that moment ──
if (!rendering) {
  const play = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const time = document.getElementById('time');
  scrub.max = FILM.duration;
  let playing = true;
  const show = () => { scrub.value = clock.seconds; time.textContent = `${clock.seconds.toFixed(2)} s`; play.textContent = playing ? 'Pause' : 'Play'; };

  if (startAt > 0) {
    // Fast-forward from 0, so springs and loops are in the right state
    playing = false;
    document.body.classList.add('seeking');
    while (clock.seconds < startAt) await clock.step(1000 / 60);
    document.body.classList.remove('seeking');
  }
  show();
  play.onclick = () => {
    if (clock.seconds >= FILM.duration) { location.search = ''; return; }
    playing = !playing; show();
  };
  scrub.onchange = () => { location.search = `?t=${Number(scrub.value).toFixed(2)}`; };

  let last = clock.real.now();
  let busy = false;
  const loop = async () => {
    const t = clock.real.now();
    const dt = Math.min(50, t - last);
    last = t;
    if (playing && !busy && clock.seconds < FILM.duration) {
      busy = true;
      await clock.step(dt);
      busy = false;
      show();
      if (clock.seconds >= FILM.duration) { playing = false; show(); }
    }
    clock.real.raf(loop);
  };
  clock.real.raf(loop);
}
