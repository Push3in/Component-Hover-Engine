import cover from './assets/player-cover.gif';
import backward from './assets/backward.svg';
import backwardStep from './assets/backward-step.svg';
import play from './assets/play.svg';
import forwardStep from './assets/forward-step.svg';
import forward from './assets/forward.svg';
import progressDot from './assets/player-progress-dot.svg';

// Figma: Component-Testing / C2 - Player (1:7)
export default function PlayerCard() {
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
        <span className="player-play">
          <img src={play} alt="Play" />
        </span>
        <img src={forwardStep} alt="Next" />
        <img src={forward} alt="Fast forward" />
      </div>

      <div className="player-progress">
        <div className="player-track">
          <img className="player-dot" src={progressDot} alt="" />
        </div>
        <div className="player-times">
          <span>0:00</span>
          <span>-2:30</span>
        </div>
      </div>
    </div>
  );
}
