// The film's clock must load before React, Motion and the cards
import { clock } from './clock.js';
import { createRoot } from 'react-dom/client';
import gsap from 'gsap';
import '../src/style.css';
import './film.css';
import FilmRibbon from './FilmRibbon.jsx';
import { FILMS } from './storyboard.js';
import { Camera } from './camera.ts';
import { addPops } from './pops.ts';

const params = new URLSearchParams(location.search);
const rendering = params.has('render');
const startAt = Number(params.get('t')) || 0;
const filmName = params.get('film') || 'tour';
const FILM = FILMS[filmName];
if (!FILM) throw new Error(`No film "${filmName}". Try: ${Object.keys(FILMS).join(', ')}`);
const preroll = FILM.preroll ?? 0;
const filmTime = () => clock.seconds - preroll;

const stage = document.getElementById('stage');
const world = document.getElementById('world');
const overlay = document.getElementById('overlay');
import { createPointer } from './pointer.js';
const pointer = createPointer(overlay);

// ── Camera and cursor state (world = the page under the camera, 1920×1080) ──
const camera = new Camera();
const cam = camera.view; // what's on screen this frame
const cur = { x: -200, y: 1300, visible: false };

const NAMED = { ribbon: '.ribbon', weather: '.weather', player: '.player', status: '.status', audience: '.audience', quote: '.quote' };
function centreOf(target, dx = 0, dy = 0) {
  const el = world.querySelector(NAMED[target] || target);
  if (!el) return { x: cam.x, y: cam.y };
  const r = el.getBoundingClientRect();
  const w = world.getBoundingClientRect();
  const s = w.width / 1920; // stage scale × camera zoom
  return { x: (r.left + r.width / 2 - w.left) / s + dx / cam.zoom, y: (r.top + r.height / 2 - w.top) / s + dy / cam.zoom };
}

let lastTick = null;
let prevView = { ...cam }; // the camera one frame ago, for motion blur
function apply() {
  const t = clock.seconds;
  prevView = { ...cam };
  camera.update(cur, lastTick === null ? 0 : t - lastTick);
  lastTick = t;
  world.style.transform = camera.transform();
  const p = camera.toStage(cur);
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

// ── Mount the real cards (the timeline below needs them in the page) ─────
const fit = () => { stage.style.scale = rendering ? 1 : Math.min(innerWidth / 1920, (innerHeight - 70) / 1080); };
addEventListener('resize', fit); fit();
await document.fonts.ready;
const root = createRoot(world);
let dials = FILM.dials ?? {};
const mountRibbon = () => root.render(<FilmRibbon dials={dials} cards={FILM.cards} />);
mountRibbon();
await clock.step(0);

const cardOf = (target) => world.querySelector(NAMED[target] || target)?.closest('.card');

const tl = gsap.timeline({ paused: true });
for (const beat of FILM.beats) {
  const { at, dur = 1, ease = 'expo.out' } = beat;
  if (beat.camera) {
    const { on, zoom } = beat.camera;
    tl.to(camera.rig, { x: () => centreOf(on).x, y: () => centreOf(on).y, zoom, duration: dur, ease }, at);
  }
  if (beat.follow) {
    const { amount = 1, ...rest } = beat.follow;
    // Start the chase from where the camera is, so it eases off instead of jumping
    if (amount > 0) tl.call(() => camera.settle(), [], at);
    tl.to(camera.follow, { amount, ...rest, duration: beat.dur ?? 0, ease }, at);
  }
  if (beat.dials) {
    // Change the cards' dials from here on (e.g. softer push while zoomed in)
    const change = beat.dials;
    tl.call(() => {
      dials = { ...dials, ...Object.fromEntries(Object.entries(change).map(([k, v]) => [k, { ...dials[k], ...v }])) };
      mountRibbon();
    }, [], at);
  }
  if (beat.pops) {
    const { on, items, hold = 1 } = beat.pops;
    const card = cardOf(on);
    if (card) addPops(tl, card, items, at, hold);
    else console.warn(`pops: no card for "${on}"`);
  }
  if (beat.cursor) {
    const c = beat.cursor;
    const dest = () => (c.at ? camera.toWorld({ x: c.at[0], y: c.at[1] }) : centreOf(c.to, c.dx, c.dy));
    tl.set(cur, { visible: true }, at);
    tl.to(cur, { x: () => dest().x, y: () => dest().y, duration: Math.max(dur, 0.001), ease }, at);
  }
  if (beat.click) {
    tl.call(() => pointer.click(), [], at);
    tl.call(() => pointer.release(), [], at + 0.12);
  }
  if (beat.caption) caption(beat.caption, at, beat.for ?? 2.5, tl);
  if (beat.title) title(beat.title, at, beat.for ?? 2, tl);
}
tl.set({}, {}, FILM.duration); // pad to the full length

// Every frame: move the timeline to the clock, then lay out camera + cursor.
// During the preroll the timeline holds at 0 (page time runs, film time doesn't).
clock.onTick(() => { tl.time(Math.min(Math.max(0, filmTime()), FILM.duration)); apply(); });
tl.time(0); apply();

// Preroll: run the page (fan intro etc.) before film time 0
while (clock.seconds < preroll) await clock.step(1000 / 60);

// ── Render mode: render.mjs calls film.frame() once per output frame ──────
// subframe(f): motion blur. Shows the camera part-way between the previous frame
// (f = 0) and this one (f = 1) without moving page time, so the cards' physics
// always run at a normal 60 fps, exactly like the preview and the site.
function subframe(f) {
  const v = { x: prevView.x + (cam.x - prevView.x) * f, y: prevView.y + (cam.y - prevView.y) * f,
    zoom: prevView.zoom + (cam.zoom - prevView.zoom) * f };
  world.style.transform = `translate(960px, 540px) scale(${v.zoom}) translate(${-v.x}px, ${-v.y}px)`;
  pointer.draw((cur.x - v.x) * v.zoom + 960, (cur.y - v.y) * v.zoom + 540);
}
window.film = { duration: FILM.duration, fps: FILM.fps, frame: (ms) => clock.step(ms), subframe, get time() { return filmTime(); } };
document.body.classList.toggle('render', rendering);

// ── Preview: plays in real time, pause freezes everything, scrub reloads to that moment ──
if (!rendering) {
  const play = document.getElementById('play');
  const scrub = document.getElementById('scrub');
  const time = document.getElementById('time');
  scrub.max = FILM.duration;
  let playing = true;
  const show = () => { scrub.value = filmTime(); time.textContent = `${filmTime().toFixed(2)} s`; play.textContent = playing ? 'Pause' : 'Play'; };

  if (startAt > 0) {
    // Fast-forward from 0, so springs and loops are in the right state
    playing = false;
    document.body.classList.add('seeking');
    while (filmTime() < startAt) await clock.step(1000 / 60);
    document.body.classList.remove('seeking');
  }
  show();
  play.onclick = () => {
    if (filmTime() >= FILM.duration) { location.search = `?film=${filmName}`; return; }
    playing = !playing; show();
  };
  scrub.onchange = () => { location.search = `?film=${filmName}&t=${Number(scrub.value).toFixed(2)}`; };

  let last = clock.real.now();
  let busy = false;
  const loop = async () => {
    const t = clock.real.now();
    const dt = Math.min(50, t - last);
    last = t;
    if (playing && !busy && filmTime() < FILM.duration) {
      busy = true;
      await clock.step(dt);
      busy = false;
      show();
      if (filmTime() >= FILM.duration) { playing = false; show(); }
    }
    clock.real.raf(loop);
  };
  clock.real.raf(loop);
}
