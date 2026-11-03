// Landscape 1920x1080 / 120fps cut of the same recordings: interaction only, no captions
import { execFileSync } from 'node:child_process';
const FF = process.argv[2], OUT = process.argv[3];
const BG = '0xf6f6f6', W = 1920, H = 1080, FPS = 120, XF = 0.4;
const scaleOf = [1.5, 1.25]; // DPR of master.mp4 and master2.mp4

// crop: [x, y, w, h] in CSS px of the recording; scaled to `width`, centred at (cx, cy)
const shots = [
  { ranges: [[0.15, 4.3]], layers: [{ crop: [160, 180, 1280, 720], width: 1920, cx: 960, cy: 540 }] },         // intro
  { ranges: [[5.2, 12.2]], layers: [{ crop: [80, 95, 1440, 810], width: 1920, cx: 960, cy: 540 }] },           // hover + push
  { ranges: [[12.9, 15.7]], layers: [{ crop: [40, 275, 960, 540], width: 1920, cx: 960, cy: 540 }] },          // player
  { ranges: [[15.6, 19.4]], layers: [{ crop: [430, 250, 960, 540], width: 1920, cx: 960, cy: 540 }] },         // status + audience
  { input: 1, ranges: [[4.3, 6.45]], layers: [{ crop: [822, 0, 1778, 1000], width: 1920, cx: 960, cy: 540 }] },  // dialkit: open the panel
  { input: 1, ranges: [[6.05, 15.6]], xfade: 'fade', layers: [                                                    // dialkit: tune it (starts XF before the previous ends, so the dissolve is continuous)
      { crop: [250, 40, 2058, 960], width: 1360, cx: 710, cy: 540 },
      { crop: [2311, 4, 274, 540], width: 450, cx: 1625, cy: 540 },
    ] },
];

const f = [], durations = [];
shots.forEach((s, i) => {
  const inp = s.input || 0;
  const css = (v) => Math.round(v * scaleOf[inp]);
  const parts = s.ranges.map(([a, b], k) => { f.push(`[${inp}:v]trim=${a}:${b},setpts=PTS-STARTPTS[s${i}r${k}]`); return `[s${i}r${k}]`; });
  const dur = s.ranges.reduce((t, [a, b]) => t + (b - a), 0);
  durations.push(dur);
  f.push(parts.length > 1 ? `${parts.join('')}concat=n=${parts.length}:v=1[s${i}]` : `${parts[0]}null[s${i}]`);
  f.push(`[s${i}]split=${s.layers.length}${s.layers.map((_, k) => `[s${i}l${k}]`).join('')}`);
  f.push(`color=c=${BG}:s=${W}x${H}:r=120:d=${dur.toFixed(3)}[s${i}bg]`);
  let prev = `[s${i}bg]`;
  s.layers.forEach((l, k) => {
    const [x, y, w, h] = l.crop;
    f.push(`[s${i}l${k}]crop=${css(w)}:${css(h)}:${css(x)}:${css(y)},scale=${l.width}:-2:flags=lanczos[s${i}c${k}]`);
    f.push(`${prev}[s${i}c${k}]overlay=x=${l.cx}-w/2:y=${l.cy}-h/2:shortest=1[s${i}o${k}]`);
    prev = `[s${i}o${k}]`;
  });
  f.push(`${prev}setsar=1,format=yuv420p[v${i}]`);
});
let acc = '[v0]', t = durations[0];
for (let i = 1; i < durations.length; i++) {
  const out = i === durations.length - 1 ? '[mix]' : `[x${i}]`;
  f.push(`${acc}[v${i}]xfade=transition=${shots[i]?.xfade || 'fadewhite'}:duration=${XF}:offset=${(t - XF).toFixed(3)}${out}`);
  acc = out; t += durations[i] - XF;
}
f.push(`[mix]null[out]`);
console.log('length', t.toFixed(2), 's');
execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'master120.mp4', '-i', 'master2_120.mp4', '-filter_complex', f.join(';'), '-map', '[out]',
  '-r', String(FPS), '-c:v', 'libx264', '-crf', '16', '-preset', 'slow', '-profile:v', 'high', '-level', '5.2', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
