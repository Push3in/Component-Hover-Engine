// Turns captured frames (irregular timing) into a constant-frame-rate master clip.
// Each output frame shows the latest captured frame at or before its time.
// Usage: node build-master.mjs <frames.json> <frames dir> <fps> <out.mp4>
import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import ffmpeg from 'ffmpeg-static';

const [meta, dir, fpsArg, out] = process.argv.slice(2);
const fps = Number(fpsArg);
const { frames } = JSON.parse(readFileSync(meta, 'utf8'));
const end = frames.at(-1).t;
const picks = [];
for (let k = 0, j = 0; k / fps <= end; k++) {
  while (j + 1 < frames.length && frames[j + 1].t <= k / fps) j++;
  picks.push(frames[j].name);
}
let list = 'ffconcat version 1.0\n';
for (const name of picks) list += `file ${dir}/${name}\nduration ${1 / fps}\n`;
list += `file ${dir}/${picks.at(-1)}\n`;
const listFile = out.replace(/\.mp4$/, '.txt');
writeFileSync(listFile, list);
console.log(`${out}: ${picks.length} frames (${new Set(picks).size} unique) at ${fps} fps`);
execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-f', 'concat', '-safe', '0', '-i', listFile,
  '-r', String(fps), '-c:v', 'libx264', '-crf', '14', '-preset', 'fast', '-pix_fmt', 'yuv420p', out], { stdio: 'inherit' });
