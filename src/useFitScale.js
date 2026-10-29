import { useEffect, useState } from 'react';

function readViewport() {
  return { width: window.innerWidth, height: window.innerHeight };
}

// Picks the card scale that makes a design of `width` × `height` (in Figma px)
// fill `fill` (0–1) of the browser window, and updates it when the window is
// resized, moved to another monitor, or zoomed. Whichever side runs out of
// room first (width or height) decides.
export default function useFitScale(width, height, fill) {
  const [viewport, setViewport] = useState(readViewport);

  useEffect(() => {
    function handleResize() {
      setViewport(readViewport());
    }
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return Math.min(
    (viewport.width * fill) / width,
    (viewport.height * fill) / height
  );
}
