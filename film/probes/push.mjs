// Logs every card's push offset (x, y, rotation) and the pointer-move count over
// film time. SUB=8 steps time like the old blur render, to compare.
// Usage (dev server running): [SUB=1] node film/probes/push.mjs [film]
import { launch, connect } from '../../video/cdp.mjs';
const { proc, page } = await launch(new URL('./.profile', import.meta.url).pathname, 9471);
const c = await connect(page.webSocketDebuggerUrl);
await c.send('Page.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://localhost:8000/film/?render&film=' + (process.argv[2] || 'push') });
for (let i = 0; i < 200 && !(await c.evaluate('!!window.film').catch(() => false)); i++) await new Promise(r => setTimeout(r, 100));
await c.evaluate(`window.__moves=0; addEventListener('pointermove', () => window.__moves++, true)`);
const SUB = Number(process.env.SUB || 1);
for (let f = 0; f < 480; f++) {
  for (let k = 0; k < SUB; k++) await c.evaluate('window.film.frame(1000/60/' + SUB + ')');
  if (f % 15 === 14) {
    const r = await c.evaluate(`[window.film.time.toFixed(2), window.__moves, ...[...document.querySelectorAll('.card')].map(el => { const m = new DOMMatrix(getComputedStyle(el).transform); return Math.round(m.e)+','+Math.round(m.f)+','+Math.round(Math.atan2(m.b,m.a)*57.3); })].join('  ')`);
    console.log(r);
  }
}
proc.kill(); process.exit(0);
