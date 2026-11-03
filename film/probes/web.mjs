// Screenshots the live dev site (not the film) at set times after load, to see
// what the real page does. Usage: node film/probes/web.mjs
import { launch, connect } from '../../video/cdp.mjs';
import { writeFileSync } from 'node:fs';
const out = new URL('./out', import.meta.url).pathname;
import { mkdirSync } from 'node:fs';
mkdirSync(out, { recursive: true });
const { proc, page } = await launch(new URL('./.profile', import.meta.url).pathname, 9470);
const c = await connect(page.webSocketDebuggerUrl);
await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1600, height: 900, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://localhost:8000/' });
const t0 = Date.now();
for (const t of [1.5, 2.5, 3.0, 3.5, 5, 6.5, 7.5, 8.5]) {
  while (Date.now() - t0 < t * 1000) await new Promise(r => setTimeout(r, 20));
  const { data } = await c.send('Page.captureScreenshot', { format: 'jpeg', quality: 80, clip: { x: 500, y: 250, width: 600, height: 400, scale: 1 } });
  writeFileSync(`${out}/web_${String(t).padStart(4, '0')}.jpg`, Buffer.from(data, 'base64'));
}
proc.kill(); process.exit(0);
