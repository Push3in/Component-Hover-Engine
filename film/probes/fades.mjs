// Logs the computed opacity of the first Sleep pieces frame by frame (catches
// fades that run in JS but pop on video).
// Usage (dev server running): node film/probes/fades.mjs [film]
import { launch, connect } from '../../video/cdp.mjs';
const { proc, page } = await launch(new URL('./.profile', import.meta.url).pathname, 9473);
const c = await connect(page.webSocketDebuggerUrl);
await c.send('Page.enable');
c.on((m) => { if (m.method === 'Runtime.consoleAPICalled') console.log('console', m.params.args.map(a => a.value ?? a.description).join(' ')); });
await c.send('Runtime.enable');
await c.send('Emulation.setDeviceMetricsOverride', { width: 1920, height: 1080, deviceScaleFactor: 1, mobile: false });
await c.send('Page.navigate', { url: 'http://localhost:8000/film/?render&film=' + (process.argv[2] || 'push') });
for (let i = 0; i < 200 && !(await c.evaluate('!!window.film').catch(() => false)); i++) await new Promise(r => setTimeout(r, 100));
for (let f = 0; f < 200; f++) {
  await c.evaluate('window.film.frame(1000/60)');
  if (f >= 125 && f <= 175 && f % 3 === 0) {
    console.log(await c.evaluate(`(() => { const els = [...document.querySelectorAll('.status .strong, .status .heat-cell, .status span')].slice(0,3); return window.film.time.toFixed(3) + ' ' + els.map(e => getComputedStyle(e).opacity + '/' + e.style.opacity + '/' + e.getAnimations().length).join(' | '); })()`));
  }
}
proc.kill(); process.exit(0);
