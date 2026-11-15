// The Status (Sleep) card's loop, shared so other cards can move in step with it.
// StatusCard calls `set(true)` when it starts building in and `set(false)` when
// it starts clearing away; anyone can listen with `on`.
const listeners = new Set();
let current = false;

export const statusLoop = {
  get shown() { return current; },
  set(shown) {
    if (shown === current) return;
    current = shown;
    listeners.forEach((fn) => fn(shown));
  },
  /** Calls `fn(shown)` on every change; returns a function that stops listening */
  on(fn) {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },
};
