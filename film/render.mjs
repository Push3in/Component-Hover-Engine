// Renders film/ frame by frame: advance the film clock by exactly one frame
// (cards, springs and the GSAP timeline all move together), screenshot it,
// pipe to ffmpeg. Because time is stepped (not real time), every frame is
// exact, at any fps or resolution.
// Usage (dev server running): node film/render.mjs [fps] [scale] [out.mp4] [--film name] [--blur n] [--shutter s]
//   node film/render.mjs 60 1 film/out-1080p60.mp4      → 1920×1080
//   node film/render.mjs 60 2 film/out-4k60.mp4         → 3840×2160
//   node film/render.mjs 60 2 film/out-push.mp4 --film push --blur 8
//
// Motion blur (--blur n): like a real camera's shutter. Each output frame is the
// average of sub-frames of the camera move across the time the shutter is open
// (--shutter 0.5 = half the frame, a "180°" shutter, the film look): n × shutter
// screenshots per frame. Only the camera is sub-stepped; page time (the cards'
// springs and push physics) still steps once per frame, because the push physics
// stack kicks differently when time is stepped finer, and the film must match the
// site. Still shots stay sharp; camera moves smear.
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { launch, connect } from '../video/cdp.mjs';

const require = createRequire(new URL('../video/package.json', import.meta.url));
const ffmpeg = require('ffmpeg-static');
const args = process.argv.slice(2);
const flag = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  if (i < 0) return fallback;
  const [, value] = args.splice(i, 2);
  return value;
};
const film = flag('film', 'tour');
const blur = Math.max(1, Math.round(Number(flag('blur', 1))));
const shutter = Math.min(1, Math.max(0.05, Number(flag('shutter', 0.5))));
const fps = Number(args[0] ?? 60);
const scale = Number(args[1] ?? 1);
const out = args[2] ?? 'film/out.mp4';
const URL_ = process.env.FILM_URL ?? `http://localhost:8000/film/?render&film=${encodeURIComponent(film)}`;

const { proc, page } = await launch(new URL('./.profile', import.meta.url).pathname, 9460);
const c = await connect(page.webSocketDebuggerUrl);
await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: scale, mobile: false });
await c.send('Page.navigate', { url: URL_ });
for (let i = 0; i < 200 && !(await c.evaluate('!!window.film').catch(() => false)); i++) await new Promise((r) => setTimeout(r, 100));
const duration = await c.evaluate('window.film.duration');
const frames = Math.ceil(duration * fps);
// Sub-frames: `open` camera positions spread over the last `shutter` of the frame
const open = blur > 1 ? Math.max(2, Math.round(blur * shutter)) : 1;
console.log(`rendering "${film}": ${frames} frames (${duration.toFixed(2)} s at ${fps} fps, ${1920 * scale}×${1080 * scale})` +
  (blur > 1 ? `, motion blur ${open} sub-frames (${Math.round(shutter * 360)}° shutter)` : '') + ` → ${out}`);

// With blur, ffmpeg receives every sub-frame and averages each group of `open` into one frame
const blend = open > 1 ? ['-vf', `tmix=frames=${open},select='eq(mod(n,${open}),${open - 1})',setpts=N/(${fps}*TB)`, '-r', String(fps)] : [];
const enc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps * open), '-i', '-',
  ...blend, '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < frames; i++) {
  for (let j = 0; j < open; j++) {
    if (open > 1) await c.evaluate(`window.film.subframe(${1 - shutter + (shutter * (j + 1)) / open})`);
    const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
    if (!enc.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => enc.stdin.once('drain', r));
  }
  await c.evaluate(`window.film.frame(${1000 / fps})`);
  if (i % 30 === 0) process.stdout.write(`\r${i}/${frames}`);
}
enc.stdin.end();
await new Promise((r) => enc.on('close', r));
console.log(`\rdone: ${out}`);
proc.kill(); process.exit(0);
