import knob from './assets/audience-knob.svg';
import trendPositive from './assets/trend-positive.svg';
import trendNeutral from './assets/trend-neutral.svg';
import trendNegative from './assets/trend-negative.svg';

const BREAKDOWN = [
  { label: 'Positive', value: '48%', trend: trendPositive },
  { label: 'Neutral', value: '20%', trend: trendNeutral },
  { label: 'Negative', value: '32%', trend: trendNegative },
];

// Figma: Component-Testing / C4 - Audience (12:41)
export default function AudienceCard() {
  return (
    <div className="tile audience">
      <div className="audience-summary">
        <p className="muted small">Audience</p>
        <p className="audience-headline">
          <span className="strong">48%</span>
          <span className="muted small">Positive</span>
        </p>
      </div>

      <div className="scale">
        <div className="scale-track audience-track">
          <span className="knob audience-knob">
            <img src={knob} alt="" />
          </span>
        </div>
        <div className="split muted tiny">
          <span>Good</span>
          <span>Bad</span>
        </div>
      </div>

      <div className="split">
        {BREAKDOWN.map(({ label, value, trend }) => (
          <div key={label} className="audience-stat">
            <p className="muted small">{label}</p>
            <p className="audience-value">
              <span>{value}</span>
              <img className={`trend-${label.toLowerCase()}`} src={trend} alt="" />
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
