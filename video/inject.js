// Injected before the page's own scripts. Slows the page clock by RATE so a
// slow screenshot loop still captures smooth frames; played back at RATE⁻¹ the
// footage runs at real speed. Also draws a macOS-style cursor that follows the
// synthetic mouse, since headless screenshots don't include one.
(() => {
  const RATE = __RATE__;
  const realNow = performance.now.bind(performance);
  const realRaf = window.requestAnimationFrame.bind(window);
  const realST = window.setTimeout.bind(window);
  const realSI = window.setInterval.bind(window);
  const base = realNow();
  const toVirtual = (t) => base + (t - base) * RATE;
  performance.now = () => toVirtual(realNow());
  window.requestAnimationFrame = (cb) => realRaf(() => cb(performance.now()));
  window.setTimeout = (h, d = 0, ...a) => realST(h, d / RATE, ...a);
  window.setInterval = (h, d = 0, ...a) => realSI(h, d / RATE, ...a);
  const ts = Object.getOwnPropertyDescriptor(Event.prototype, 'timeStamp');
  Object.defineProperty(Event.prototype, 'timeStamp', { configurable: true, get() { return toVirtual(ts.get.call(this)); } });
  window.__virtualNow = () => performance.now();

  // Cursor
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 28 28"><path d="M6 3.5 L6 22 L10.6 17.6 L13.6 24.6 L16.6 23.3 L13.7 16.5 L20 16.5 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>`;
  function mount() {
    const el = document.createElement('div');
    el.id = '__cursor';
    el.innerHTML = svg;
    Object.assign(el.style, { position: 'fixed', left: '0', top: '0', zIndex: 2147483647, pointerEvents: 'none',
      opacity: '0', transformOrigin: '6px 3.5px', filter: 'drop-shadow(0 1px 1.5px rgb(0 0 0 / .25))', willChange: 'transform' });
    document.documentElement.appendChild(el);
    let x = 0, y = 0, s = 1;
    const place = () => { el.style.transform = `translate(${x - 6}px, ${y - 3.5}px) scale(${s})`; };
    addEventListener('mousemove', (e) => { x = e.clientX; y = e.clientY; el.style.opacity = '1'; place(); }, true);
    addEventListener('mousedown', () => { s = 0.86; place(); }, true);
    addEventListener('mouseup', () => { s = 1; place(); }, true);
    window.__hideCursor = () => { el.style.opacity = '0'; };
  }
  if (document.documentElement) mount(); else addEventListener('DOMContentLoaded', mount);
})();
