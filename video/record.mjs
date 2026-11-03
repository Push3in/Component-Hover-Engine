import { launch, connect } from './cdp.mjs';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
const OUT = process.argv[2];
const RATE = 0.07, W = 1600, H = 1000, DPR = 1.5, END = 31; // END: virtual seconds to record
rmSync(OUT + '/frames', { recursive: true, force: true }); mkdirSync(OUT + '/frames', { recursive: true });
const { proc, page } = await launch(OUT + '/profile-rec');
const cam = await connect(page.webSocketDebuggerUrl);   // screenshots
const hand = cam;  // mouse on the camera's connection so coordinates match
await cam.send('Page.enable');
await cam.send('Animation.enable');
await cam.send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: DPR, mobile: false });
await cam.send('Page.addScriptToEvaluateOnNewDocument', { source: readFileSync(new URL('./inject.js', import.meta.url), 'utf8').replace('__RATE__', String(RATE)) });

let t0 = 0; // real ms at navigation
const vnow = () => (Date.now() - t0) * RATE / 1000;
const until = async (v) => { while (vnow() < v) await new Promise((r) => setTimeout(r, 2)); };
const ease = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
let mx = -40, my = 700, buttons = 0;
// One at a time: input sent while a screenshot is in flight lands at the wrong spot
let busy = Promise.resolve();
const exclusive = (fn) => { const run = busy.then(fn); busy = run.catch(() => {}); return run; };
const mouse = (type, x, y, extra = {}) => exclusive(() => hand.send('Input.dispatchMouseEvent', { type, x, y, button: buttons || type !== 'mouseMoved' ? 'left' : 'none', buttons, clickCount: 1, ...extra }));
async function move(x, y, dur, { arc = 0.12, easing = ease } = {}) {
  const sx = mx, sy = my, start = vnow();
  // gentle arc: control point offset perpendicular to the path
  const cx = (sx + x) / 2 - (y - sy) * arc, cy = (sy + y) / 2 + (x - sx) * arc;
  for (;;) {
    const k = Math.min(1, (vnow() - start) / dur), e = easing(k);
    const px = (1 - e) ** 2 * sx + 2 * (1 - e) * e * cx + e * e * x;
    const py = (1 - e) ** 2 * sy + 2 * (1 - e) * e * cy + e * e * y;
    await mouse('mouseMoved', px, py); mx = px; my = py;
    if (k >= 1) break;
    await new Promise((r) => setTimeout(r, 8));
  }
}
const down = async () => { buttons = 1; await mouse('mousePressed', mx, my); };
const up = async () => { buttons = 0; await mouse('mouseReleased', mx, my); };
const click = async () => { await down(); await until(vnow() + 0.08); await up(); };
const sx = (v, min, max) => 1317 + ((v - min) / (max - min)) * 254;

// Camera loop
const frames = [];
let filming = true;
let camLoop;
const startCam = () => (camLoop = (async () => {
  let n = 0;
  while (filming) {
    const a = vnow();
    let r;
    try { r = await exclusive(() => cam.send('Page.captureScreenshot', { format: 'jpeg', quality: 90 }, 4000)); }
    catch { await new Promise((res) => setTimeout(res, 50)); continue; } // mid-navigation: try again
    const b = vnow();
    const name = `f${String(n++).padStart(5, '0')}.jpg`;
    writeFileSync(`${OUT}/frames/${name}`, Buffer.from(r.data, 'base64'));
    frames.push({ name, t: (a + b) / 2 });
  }
})());

t0 = Date.now();
await cam.send('Page.navigate', { url: 'https://component-hover-engine.vercel.app/' });
startCam();
await cam.send('Animation.setPlaybackRate', { playbackRate: RATE });

const marks = {};
const sine = (k) => 0.5 - Math.cos(Math.PI * k) / 2;    // gentle hover glides: low peak speed, no push
const hold = (d) => until(vnow() + d);
// Hover: slow glides card to card so each one just grows
await until(4.4); marks.hoverStart = vnow();
mx = 600; my = 1000;
await move(505, 575, 2.4, { easing: sine, arc: 0.03 }); marks.hoverPlayer = vnow(); await hold(0.9);
await move(770, 535, 1.9, { easing: sine, arc: 0.02 }); marks.hoverStatus = vnow(); await hold(1.0);
await move(1035, 550, 1.9, { easing: sine, arc: 0.02 }); marks.hoverAudience = vnow(); await hold(0.9);
await move(1440, 880, 1.3, { easing: sine }); await hold(0.35);
// One fast swipe through the whole row
marks.swipeStart = vnow();
await move(140, 430, 0.42, { arc: -0.06, easing: (k) => k });
await move(60, 380, 0.12, { easing: (k) => k });
marks.swipeEnd = vnow();
await hold(1.6); marks.settled = vnow();
// Player: pause, then resume
await move(538, 540, 1.1, { easing: sine }); await hold(0.35);
marks.pause = vnow(); await click();
await hold(1.4);
marks.resume = vnow(); await click();
await hold(0.6);
await move(780, 790, 1.0, { easing: sine }); marks.playerEnd = vnow();
// Watch Status + Audience run on their own
await hold(3.4); marks.end = vnow();
await until(END);

filming = false; await camLoop;
writeFileSync(`${OUT}/frames.json`, JSON.stringify({ frames, marks, W, H, DPR, RATE }));
console.log('frames', frames.length, 'virtual', vnow().toFixed(2), 'marks', JSON.stringify(marks));
proc.kill(); process.exit(0);
