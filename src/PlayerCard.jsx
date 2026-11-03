import cover from './assets/player-cover.gif';
import backward from './assets/backward.svg';
import backwardStep from './assets/backward-step.svg';
import play from './assets/play.svg';
import pause from './assets/pause.svg';
import forwardStep from './assets/forward-step.svg';
import forward from './assets/forward.svg';
import progressDot from './assets/player-progress-dot.svg';
import usePlayback from './usePlayback.js';

// Song length in seconds (2:30)
const DURATION = 150;

function formatTime(totalSeconds) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return `${minutes}:${seconds}`;
}

// Figma: Component-Testing / C2 - Player (1:7)
export default function PlayerCard() {
  const { seconds, playing, toggle, trackRef } = usePlayback(DURATION);

  return (
    <div className="tile player">
      <div className="player-head">
        <img className="player-cover" src={cover} alt="" />
        <div className="player-meta">
          <p className="player-title">Warriors</p>
          <p className="player-artist">Imagine Dragons</p>
        </div>
      </div>

      <div className="player-controls">
        <img src={backward} alt="Rewind" />
        <img src={backwardStep} alt="Previous" />
        <button
          type="button"
          className="player-play"
          onClick={toggle}
          aria-label={playing ? 'Pause' : 'Play'}
        >
          <img src={playing ? pause : play} alt="" />
        </button>
        <img src={forwardStep} alt="Next" />
        <img src={forward} alt="Fast forward" />
      </div>

      <div className="player-progress">
        <div className="player-track" ref={trackRef}>
          <span className="player-dot-rail">
            <img className="player-dot" src={progressDot} alt="" />
          </span>
        </div>
        <div className="player-times">
          <span>{formatTime(seconds)}</span>
          <span>-{formatTime(DURATION - seconds)}</span>
        </div>
      </div>
    </div>
  );
}
