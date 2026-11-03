import { launch, connect } from './cdp.mjs';
import { writeFileSync, readFileSync, mkdirSync, rmSync } from 'node:fs';
const OUT = process.argv[2];
const RATE = 0.06, W = 2600, H = 1000, DPR = 1.25, END = 15.6; // END: virtual seconds to record
const FR = OUT + '/frames2'; rmSync(FR, { recursive: true, force: true }); mkdirSync(FR, { recursive: true });
const { proc, page } = await launch(OUT + '/profile-rec');
const cam = await connect(page.webSocketDebuggerUrl);   // screenshots
const hand = cam;  // mouse on the same connection as the camera, so coordinates match
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
const sx = (v, min, max) => (W - 283) + ((v - min) / (max - min)) * 254;

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
    writeFileSync(`${FR}/${name}`, Buffer.from(r.data, 'base64'));
    frames.push({ name, t: (a + b) / 2 });
  }
})());

t0 = Date.now();
await cam.send('Page.navigate', { url: 'https://component-hover-engine.vercel.app/' });
startCam();
await cam.send('Animation.setPlaybackRate', { playbackRate: RATE });

const marks = {};
await until(4.2); marks.dialStart = vnow();
const val = (label) => cam.evaluate(`[...document.querySelectorAll('.dialkit-slider-wrapper')].find(s => s.textContent.trim().startsWith('${label}'))?.textContent.trim()`);
const log = [];
mx = 2000; my = 1040;
await move(W - 37, 37, 1.1);
await until(vnow() + 0.2); await click();
await until(vnow() + 0.7);
async function slide(label, y, from, to, min, max, dur) {
  await move(sx(from, min, max), y, 0.55); await down();
  await move(sx(to, min, max), y + 1, dur, { arc: 0 }); await up();
  log.push(await exclusive(() => val(label)));
  await until(vnow() + 0.45);
}
await slide('Angle', 466, 6, 15, 0, 20, 1.2);
await slide('Curve', 508, 12, 40, 0, 60, 1.2);
await slide('Overlap', 424, 60, 120, 0, 200, 1.1);
await slide('Fill', 132, 0.75, 0.6, 0.3, 1, 1.0);
await move(sx(0.6, 0.3, 1) - 40, 260, 0.7);
console.log('values', log.join(' | '));
marks.dialEnd = vnow();
await until(END);

filming = false; await camLoop;
writeFileSync(`${OUT}/frames2.json`, JSON.stringify({ frames, marks, W, H, DPR, RATE }));
console.log('frames', frames.length, 'virtual', vnow().toFixed(2), 'marks', JSON.stringify(marks));
proc.kill(); process.exit(0);
