// A virtual mouse for the film. It draws a cursor and sends real pointer events
// to whatever is under it, so hover, push and clicks go through the cards' own
// code, exactly like a person using the page.

// A real mouse reports ~60 moves a second. The film can step time much finer
// (motion blur renders 8 sub-steps per frame), and the cards' push physics add
// a kick per move event, so moves are sent at a fixed rate of film time, never
// per step: the ribbon reacts exactly like it does on the site at any fps/blur.
const MOVE_RATE = 60;

export function createPointer(stage) {
  const cursor = document.createElement('div');
  cursor.className = 'film-cursor';
  cursor.innerHTML = '<svg width="34" height="34" viewBox="0 0 28 28"><path d="M6 3.5 L6 22 L10.6 17.6 L13.6 24.6 L16.6 23.3 L13.7 16.5 L20 16.5 Z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
  stage.append(cursor);

  let over = null;   // element under the pointer
  let client = null; // last position in window coordinates
  let lastMove = -Infinity; // film time (ms) of the last move event
  const init = (x, y, extra = {}) => ({ bubbles: true, cancelable: true, composed: true, clientX: x, clientY: y,
    pointerId: 1, pointerType: 'mouse', isPrimary: true, button: 0, view: window, ...extra });

  return {
    /** Place the cursor at a point on the stage (1920×1080 px) */
    place(stageX, stageY, visible) {
      const r = stage.getBoundingClientRect();
      const s = r.width / 1920;
      cursor.style.opacity = visible ? '1' : '0';
      cursor.style.transform = `translate(${stageX - 7}px, ${stageY - 4}px)`;
      if (!visible) { this.leave(); return; }
      const x = r.left + stageX * s;
      const y = r.top + stageY * s;
      if (client && client.x === x && client.y === y) return;
      const now = performance.now(); // the film clock
      if (client && now - lastMove < 1000 / MOVE_RATE - 0.01) return;
      lastMove = now;
      client = { x, y };
      cursor.style.pointerEvents = 'none';
      const target = document.elementFromPoint(x, y) || document.body;
      if (target !== over) {
        if (over) over.dispatchEvent(new PointerEvent('pointerout', init(x, y, { relatedTarget: target })));
        target.dispatchEvent(new PointerEvent('pointerover', init(x, y, { relatedTarget: over })));
        over = target;
      }
      target.dispatchEvent(new PointerEvent('pointermove', init(x, y, { buttons: 0 })));
    },
    /** Move the drawn cursor only, no events (used for motion-blur sub-frames) */
    draw(stageX, stageY) {
      cursor.style.transform = `translate(${stageX - 7}px, ${stageY - 4}px)`;
    },
    leave() {
      if (over && client) over.dispatchEvent(new PointerEvent('pointerout', init(client.x, client.y, { relatedTarget: null })));
      over = null; client = null; lastMove = -Infinity;
    },
    click() {
      if (!over || !client) return;
      const { x, y } = client;
      cursor.classList.add('down');
      over.dispatchEvent(new PointerEvent('pointerdown', init(x, y, { buttons: 1 })));
      over.dispatchEvent(new MouseEvent('mousedown', init(x, y, { buttons: 1 })));
      over.dispatchEvent(new PointerEvent('pointerup', init(x, y)));
      over.dispatchEvent(new MouseEvent('mouseup', init(x, y)));
      over.dispatchEvent(new MouseEvent('click', init(x, y)));
    },
    release() { cursor.classList.remove('down'); },
  };
}
