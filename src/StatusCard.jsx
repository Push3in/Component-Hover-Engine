import arrowUp from './assets/arrow-up.svg';
import knob from './assets/status-knob.svg';

// Heatmap intensity per cell, 0 (lightest) to 3 (darkest) — see .heat-* in style.css
const HEATMAP = [
  [3, 0, 0, 1],
  [0, 1, 2, 0],
  [0, 2, 0, 3],
];

// Figma: Component-Testing / C3 - Status (1:60)
export default function StatusCard() {
  return (
    <div className="tile status">
      <div className="split muted small">
        <span>Title</span>
        <span>Description</span>
      </div>

      <div className="status-title">
        <p className="strong">9 Comments</p>
        <span className="badge">
          <img src={arrowUp} alt="" />
          <span>10%</span>
        </span>
      </div>

      <div className="heatmap">
        {HEATMAP.flat().map((level, i) => (
          <span key={i} className={`heat-${level}`} />
        ))}
      </div>

      <div className="scale">
        <div className="scale-track status-track">
          <span className="knob status-knob">
            <img src={knob} alt="" />
          </span>
        </div>
        <div className="split muted tiny">
          <span>less</span>
          <span>more positive</span>
        </div>
      </div>
    </div>
  );
}
