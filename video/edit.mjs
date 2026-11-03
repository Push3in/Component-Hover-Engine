// Cuts the 60fps master (2400x1500, = 1600x1000 CSS px at 1.5x) into a vertical short
import { execFileSync } from 'node:child_process';
import { homedir } from 'node:os';
const FF = process.argv[2], OUT = process.argv[3];
const FONT = `${homedir()}/Library/Fonts/TimelessSans-SansRegular.ttf`;
const FONTM = `${homedir()}/Library/Fonts/TimelessSans-SansMedium.ttf`;
const BG = '0xf6f6f6', W = 1080, H = 1920, XF = 0.4;
const scaleOf = [1.5, 1.25]; // DPR of master.mp4 and master2.mp4

// crop: [x, y, w, h] in CSS px; the crop is scaled to `width` and centred at `cy`
const shots = [
  { label: 'Intro', note: 'A pile in the middle, then the fan', ranges: [[0.15, 4.3]], layers: [{ crop: [230, 320, 1160, 440], width: 1080, cy: 960 }] },
  { label: 'Hover + push', note: 'Cards grow, swipes knock them around', ranges: [[5.2, 12.2]], layers: [{ crop: [130, 250, 1340, 560], width: 1080, cy: 960 }] },
  { label: 'Player', note: 'Pause and resume, live time', ranges: [[12.9, 15.7]], layers: [{ crop: [190, 330, 640, 420], width: 1080, cy: 960 }] },
  { label: 'Status + Audience', note: 'Staggered build-in, a self-dragging knob', ranges: [[15.6, 19.4]], layers: [{ crop: [590, 340, 640, 400], width: 1080, cy: 960 }] },
  { label: 'DialKit', note: 'Angle, curve, overlap and fill, tuned live', input: 1, ranges: [[4.3, 15.6]], layers: [
      { crop: [2311, 4, 274, 540], width: 528, cy: 700 },
      { crop: [280, 230, 2040, 640], width: 1080, cy: 1500 },
    ] },
];

const esc = (s) => s.replace(/\\/g, '\\\\').replace(/:/g, '\\:').replace(/'/g, "\u2019");
const text = (t, x, y, size, color, font = FONT) => `drawtext=fontfile='${font}':text='${esc(t)}':x=${x}:y=${y}:fontsize=${size}:fontcolor=${color}`;
function captions(i, label, note) {
  return [
    text('Card Hover Engine', 64, 72, 34, '0x242424', FONTM),
    text(`0${i + 1} / 0${shots.length}`, 'w-tw-64', 72, 34, '0x7a7a7a'),
    text(label, 64, 'h-150', 44, '0x242424', FONTM),
    text(note, 64, 'h-92', 32, '0x7a7a7a'),
  ].join(',');
}

let f = [], durations = [], inputs = 0;
shots.forEach((s, i) => {
  // join this shot's time ranges into one clip
  const inp = s.input || 0;
  const css = (v) => Math.round(v * scaleOf[inp]);
  const parts = s.ranges.map(([a, b], k) => { f.push(`[${inp}:v]trim=${a}:${b},setpts=PTS-STARTPTS[s${i}r${k}]`); return `[s${i}r${k}]`; });
  const dur = s.ranges.reduce((t, [a, b]) => t + (b - a), 0);
  durations.push(dur);
  if (parts.length > 1) f.push(`${parts.join('')}concat=n=${parts.length}:v=1[s${i}]`); else f.push(`${parts[0]}null[s${i}]`);
  f.push(`[s${i}]split=${s.layers.length}${s.layers.map((_, k) => `[s${i}l${k}]`).join('')}`);
  f.push(`color=c=${BG}:s=${W}x${H}:r=60:d=${dur.toFixed(3)}[s${i}bg]`);
  let prev = `[s${i}bg]`;
  s.layers.forEach((l, k) => {
    const [x, y, w, h] = l.crop;
    f.push(`[s${i}l${k}]crop=${css(w)}:${css(h)}:${css(x)}:${css(y)},scale=${l.width}:-2:flags=lanczos[s${i}c${k}]`);
    f.push(`${prev}[s${i}c${k}]overlay=x=(W-w)/2:y=${l.cy}-h/2:shortest=1[s${i}o${k}]`);
    prev = `[s${i}o${k}]`;
  });
  f.push(`${prev}${captions(i, s.label, s.note)},setsar=1,format=yuv420p[v${i}]`);
});
// end card
const END = 2.4;
f.push(`color=c=${BG}:s=${W}x${H}:r=60:d=${END},${text('Card Hover Engine', '(w-tw)/2', 'h/2-70', 72, '0x242424', FONTM)},${text('component-hover-engine.vercel.app', '(w-tw)/2', 'h/2+40', 36, '0x7a7a7a')},setsar=1,format=yuv420p[v${shots.length}]`);
durations.push(END);
// crossfade everything together
let acc = `[v0]`, t = durations[0];
for (let i = 1; i < durations.length; i++) {
  const out = i === durations.length - 1 ? '[out]' : `[x${i}]`;
  f.push(`${acc}[v${i}]xfade=transition=fadewhite:duration=${XF}:offset=${(t - XF).toFixed(3)}${out}`);
  acc = out; t += durations[i] - XF;
}
console.log('length', t.toFixed(2), 's');
execFileSync(FF, ['-hide_banner', '-loglevel', 'error', '-y', '-i', 'master.mp4', '-i', 'master2.mp4', '-filter_complex', f.join(';'), '-map', '[out]',
  '-r', '60', '-c:v', 'libx264', '-crf', '17', '-preset', 'slow', '-profile:v', 'high', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', OUT], { stdio: 'inherit' });
