// Renders film/ frame by frame: seek the GSAP timeline to each frame's time,
// screenshot it, pipe to ffmpeg. Because time is stepped (not real time),
// every frame is exact, at any fps or resolution.
// Usage (dev server running): node film/render.mjs [fps] [scale] [out.mp4]
//   node film/render.mjs 60 1 film/out-1080p60.mp4      → 1920×1080
//   node film/render.mjs 60 2 film/out-4k60.mp4         → 3840×2160
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { launch, connect } from '../video/cdp.mjs';

const require = createRequire(new URL('../video/package.json', import.meta.url));
const ffmpeg = require('ffmpeg-static');
const fps = Number(process.argv[2] ?? 60);
const scale = Number(process.argv[3] ?? 1);
const out = process.argv[4] ?? 'film/out.mp4';
const URL_ = process.env.FILM_URL ?? 'http://localhost:8000/film/?render';

const { proc, page } = await launch(new URL('./.profile', import.meta.url).pathname, 9460);
const c = await connect(page.webSocketDebuggerUrl);
await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: scale, mobile: false });
await c.send('Page.navigate', { url: URL_ });
for (let i = 0; i < 100 && !(await c.evaluate('!!window.film').catch(() => false)); i++) await new Promise((r) => setTimeout(r, 100));
await c.evaluate('document.fonts.ready.then(() => true)');
const duration = await c.evaluate('window.film.duration');
const frames = Math.ceil(duration * fps);
console.log(`rendering ${frames} frames (${duration.toFixed(2)} s at ${fps} fps, ${1920 * scale}×${1080 * scale}) → ${out}`);

const enc = spawn(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'image2pipe', '-framerate', String(fps), '-i', '-',
  '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', out], { stdio: ['pipe', 'inherit', 'inherit'] });
for (let i = 0; i < frames; i++) {
  await c.evaluate(`window.film.seek(${i / fps})`);
  const { data } = await c.send('Page.captureScreenshot', { format: 'png' });
  if (!enc.stdin.write(Buffer.from(data, 'base64'))) await new Promise((r) => enc.stdin.once('drain', r));
  if (i % 60 === 0) process.stdout.write(`\r${i}/${frames}`);
}
enc.stdin.end();
await new Promise((r) => enc.on('close', r));
console.log(`\rdone: ${out}`);
proc.kill(); process.exit(0);
