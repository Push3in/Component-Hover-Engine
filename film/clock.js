// The film's clock. Imported first, before React, Motion or the cards, so they
// all read time from here instead of the real clock.
//
// Time only moves when the film says so: clock.step(ms) advances it, fires any
// timers that came due, then runs one animation frame. Played back frame by
// frame, every spring, the Player's playback, the Status loop and the Audience
// knob land on exactly the same pose every render, at any frame rate.

const real = {
  now: performance.now.bind(performance),
  raf: window.requestAnimationFrame.bind(window),
  setTimeout: window.setTimeout.bind(window),
  clearTimeout: window.clearTimeout.bind(window),
  animate: Element.prototype.animate,
  fetch: window.fetch.bind(window),
};

let now = 0; // film time in ms
let nextId = 1;
let frameQueue = [];
const timers = new Map();
const nativeAnimations = new Set();

// ── Time ───────────────────────────────────────────────────────────────────
performance.now = () => now;
const timeStamp = Object.getOwnPropertyDescriptor(Event.prototype, 'timeStamp');
Object.defineProperty(Event.prototype, 'timeStamp', { configurable: true, get: () => now });

// ── Animation frames and timers ────────────────────────────────────────────
window.requestAnimationFrame = (callback) => { const id = nextId++; frameQueue.push({ id, callback }); return id; };
window.cancelAnimationFrame = (id) => { frameQueue = frameQueue.filter((f) => f.id !== id); };
function addTimer(fn, delay, args, repeat) {
  const id = nextId++;
  const ms = Math.max(0, Number(delay) || 0);
  timers.set(id, { at: now + ms, fn, args, repeat: repeat ? Math.max(1, ms) : 0 });
  return id;
}
window.setTimeout = (fn, delay, ...args) => addTimer(fn, delay, args, false);
window.setInterval = (fn, delay, ...args) => addTimer(fn, delay, args, true);
window.clearTimeout = window.clearInterval = (id) => timers.delete(id);

// ── Native (Web Animations) fades: Motion hands some values to the browser,
// which would run them on the real clock. Hold them paused and set their time.
Element.prototype.animate = function (...args) {
  const animation = real.animate.apply(this, args);
  animation.pause();
  animation.play = () => {};
  nativeAnimations.add({ animation, start: now });
  return animation;
};
function syncNativeAnimations() {
  for (const entry of nativeAnimations) {
    const { animation, start } = entry;
    if (animation.playState === 'idle' || animation.playState === 'finished') { nativeAnimations.delete(entry); continue; }
    const end = animation.effect?.getComputedTiming().endTime ?? 0;
    const t = (now - start) * (animation.playbackRate || 1);
    if (t >= end) { animation.finish(); nativeAnimations.delete(entry); }
    else animation.currentTime = t;
  }
}

// ── Same "random" every render (the Audience knob picks random spots) ─────
let seed = 20261103;
Math.random = () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// ── Fixed sample weather instead of the live forecast ─────────────────────
window.fetch = (url, ...rest) => {
  if (String(url).includes('api.open-meteo.com')) {
    const body = { current: { temperature_2m: 31.5, apparent_temperature: 36, weather_code: 2, is_day: 1 } };
    return Promise.resolve(new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } }));
  }
  return real.fetch(url, ...rest);
};

// Lets React and promise callbacks run before the next frame
const yieldTask = () => new Promise((resolve) => {
  const channel = new MessageChannel();
  channel.port1.onmessage = () => resolve();
  channel.port2.postMessage(0);
});

const listeners = [];

export const clock = {
  get ms() { return now; },
  get seconds() { return now / 1000; },
  /** Called every frame, after time moves and before the frame is drawn */
  onTick(fn) { listeners.push(fn); },
  /** Advance by `ms`: fire due timers in order, then run one animation frame */
  async step(ms) {
    const target = now + ms;
    for (;;) {
      let due = null;
      for (const [id, timer] of timers) if (timer.at <= target && (!due || timer.at < due[1].at)) due = [id, timer];
      if (!due) break;
      const [id, timer] = due;
      now = Math.max(now, timer.at);
      if (timer.repeat) timer.at += timer.repeat; else timers.delete(id);
      try { timer.fn(...(timer.args || [])); } catch (e) { console.error(e); }
      await yieldTask();
    }
    now = target;
    listeners.forEach((fn) => fn(now / 1000));
    const frame = frameQueue; frameQueue = [];
    frame.forEach(({ callback }) => { try { callback(now); } catch (e) { console.error(e); } });
    syncNativeAnimations();
    await yieldTask();
    await yieldTask();
  },
  real,
};
