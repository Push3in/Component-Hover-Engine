// Slow motion for checking animations: makes the whole page's clock run slower.
//
// Motion, the Player's playback and the Status / Audience timers all read the
// time from performance.now(), requestAnimationFrame or setTimeout. This wraps
// those three so time passes at `rate` (0.25 = quarter speed) instead of
// changing every animation one by one.
//
// Motion also hands some values (opacity, filter…) to the browser's own
// animation engine (Web Animations), which runs on the real clock. Those are
// slowed with their playbackRate, otherwise a digit's fade would finish at
// full speed while its slide crawled along in slow motion. The setting is remembered across
// reloads, so the page-load intro can be watched slowed down too.

const KEY = 'slow-motion';
const realNow = performance.now.bind(performance);
const realRaf = window.requestAnimationFrame.bind(window);
const realSetTimeout = window.setTimeout.bind(window);

function readSaved() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) ?? { enabled: false, speed: 0.25 };
  } catch {
    return { enabled: false, speed: 0.25 };
  }
}

export const savedSlowMotion = readSaved();

let rate = savedSlowMotion.enabled ? savedSlowMotion.speed : 1;
// Slowed time carries on from where it was whenever the rate changes, so
// nothing jumps when slow motion is switched on or off
let realBase = realNow();
let slowBase = realBase;

performance.now = () => slowBase + (realNow() - realBase) * rate;
window.requestAnimationFrame = (callback) => realRaf(() => callback(performance.now()));
window.setTimeout = (handler, delay = 0, ...args) => realSetTimeout(handler, delay / rate, ...args);

const realAnimate = Element.prototype.animate;
Element.prototype.animate = function (...args) {
  const animation = realAnimate.apply(this, args);
  animation.playbackRate *= rate;
  return animation;
};

// Re-time the browser's animations that are already running
function rescaleNativeAnimations(from, to) {
  for (const animation of document.getAnimations()) {
    const next = (animation.playbackRate / from) * to;
    if (animation.updatePlaybackRate) animation.updatePlaybackRate(next);
    else animation.playbackRate = next;
  }
}

export function setSlowMotion(enabled, speed) {
  const next = enabled ? speed : 1;
  if (next !== rate) {
    slowBase = performance.now();
    realBase = realNow();
    rescaleNativeAnimations(rate, next);
    rate = next;
  }
  try {
    localStorage.setItem(KEY, JSON.stringify({ enabled, speed }));
  } catch {
    // Storage blocked: slow motion still works, it just won't survive a reload
  }
}
