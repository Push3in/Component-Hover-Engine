import { useState } from 'react';
import arrowLeft from './assets/arrow-left.svg';

// The first one is the Figma copy; the rest are kept to a similar length so the
// card keeps its three-line shape
const QUOTES = [
  'Design can be sometimes tricky and sometimes it can make you powerful.',
  'Good design is mostly invisible until the moment it goes missing.',
  'Every pixel you remove is one less thing someone has to understand.',
  'Make it work, then make it clear, and only then make it beautiful.',
  'The best interfaces feel like they were always meant to be there.',
];

// Figma: Component-Testing / C5 - Quote (12:73)
export default function QuoteCard() {
  const [index, setIndex] = useState(0);

  // Step through the quotes, wrapping around at either end
  function step(direction) {
    setIndex((i) => (i + direction + QUOTES.length) % QUOTES.length);
  }

  return (
    <div className="tile quote">
      <button type="button" className="quote-back" onClick={() => step(-1)}>
        <img src={arrowLeft} alt="Previous quote" />
      </button>
      <p aria-live="polite">{QUOTES[index]}</p>
      <button type="button" className="quote-next" onClick={() => step(1)}>
        Try another quote
      </button>
    </div>
  );
}
