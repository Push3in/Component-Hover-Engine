// The film camera. Two layers, mixed every frame:
//
//   rig     what the storyboard asks for: GSAP tweens it to a card or framing
//   follow  a trailing point that chases the cursor like a camera operator,
//           with lag and momentum (a critically damped spring)
//
// `follow.amount` blends between them (0 = rig only, 1 = chase the cursor).
// Zoom always comes from the rig. Everything is in world px (the 1920×1080 page).
//
// The chase is stateful, so it must be advanced every frame with the frame's dt.
// The film clock steps exactly, so renders still come out identical every time.

export interface Point { x: number; y: number }
export interface View extends Point { zoom: number }

export interface Follow {
  /** 0 = camera ignores the cursor, 1 = camera chases it fully */
  amount: number;
  /** Seconds the chase takes to roughly catch up (higher = lazier, more momentum) */
  lag: number;
  /** Aim this far from the cursor, in world px (e.g. dy < 0 keeps the card above the pointer in frame) */
  dx: number;
  dy: number;
}

/** Critically damped spring toward a target (Unity's SmoothDamp). Eases in and out, never overshoots. */
function smoothDamp(current: number, target: number, velocity: { v: number }, smoothTime: number, dt: number): number {
  const omega = 2 / Math.max(0.0001, smoothTime);
  const x = omega * dt;
  const exp = 1 / (1 + x + 0.48 * x * x + 0.235 * x * x * x);
  const change = current - target;
  const temp = (velocity.v + omega * change) * dt;
  velocity.v = (velocity.v - omega * temp) * exp;
  return target + (change + temp) * exp;
}

export class Camera {
  /** Tweened by the timeline */
  readonly rig: View = { x: 960, y: 540, zoom: 1 };
  /** Tweened by the timeline */
  readonly follow: Follow = { amount: 0, lag: 0.22, dx: 0, dy: 0 };
  /** What the camera actually shows this frame: read this to lay out the world */
  readonly view: View = { x: 960, y: 540, zoom: 1 };

  private trail: Point | null = null;
  private readonly vx = { v: 0 };
  private readonly vy = { v: 0 };

  /** Advance one frame. `cursor` is in world px, `dt` in seconds. */
  update(cursor: Point, dt: number): View {
    const aim = { x: cursor.x + this.follow.dx, y: cursor.y + this.follow.dy };
    if (!this.trail) this.trail = { ...aim };
    else if (dt > 0) {
      this.trail.x = smoothDamp(this.trail.x, aim.x, this.vx, this.follow.lag, dt);
      this.trail.y = smoothDamp(this.trail.y, aim.y, this.vy, this.follow.lag, dt);
    }
    const a = Math.min(1, Math.max(0, this.follow.amount));
    this.view.x = this.rig.x + (this.trail.x - this.rig.x) * a;
    this.view.y = this.rig.y + (this.trail.y - this.rig.y) * a;
    this.view.zoom = this.rig.zoom;
    return this.view;
  }

  /** Put the chase point where the camera is now, so turning follow on doesn't jump */
  settle(): void {
    this.trail = { x: this.view.x - this.follow.dx, y: this.view.y - this.follow.dy };
    this.vx.v = 0;
    this.vy.v = 0;
  }

  /** World point → stage point (1920×1080) */
  toStage(p: Point): Point {
    const { x, y, zoom } = this.view;
    return { x: (p.x - x) * zoom + 960, y: (p.y - y) * zoom + 540 };
  }

  /** Stage point → world point */
  toWorld(p: Point): Point {
    const { x, y, zoom } = this.view;
    return { x: (p.x - 960) / zoom + x, y: (p.y - 540) / zoom + y };
  }

  /** CSS transform for the world layer */
  transform(): string {
    const { x, y, zoom } = this.view;
    return `translate(960px, 540px) scale(${zoom}) translate(${-x}px, ${-y}px)`;
  }
}
