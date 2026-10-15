import { useEffect, useState } from 'react';
import { motion } from 'motion/react';

const WEATHER_URL =
  'https://api.open-meteo.com/v1/forecast' +
  '?latitude=13.754&longitude=100.5014' +
  '&current=temperature_2m,apparent_temperature,weather_code,is_day' +
  '&timezone=Asia%2FBangkok';

// WMO weather codes → short labels
function conditionLabel(code, isDay) {
  if (code === 0) return isDay ? 'sunny' : 'clear';
  if (code <= 2) return 'partly cloudy';
  if (code === 3) return 'overcast';
  if (code === 45 || code === 48) return 'foggy';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storms';
  return '';
}

// Figma: Component-List / Weather Components (1:2)
export default function WeatherCard({ ref, x, y, rotate, scale, transition }) {
  const [weather, setWeather] = useState({ temp: '—°C', feels: '—°C', condition: 'locating…' });

  useEffect(() => {
    async function updateWeather() {
      try {
        const res = await fetch(WEATHER_URL);
        if (!res.ok) throw new Error(res.status);
        const { current } = await res.json();

        setWeather({
          temp: `${current.temperature_2m.toFixed(1)}°C`,
          feels: `${Math.round(current.apparent_temperature)}°C`,
          condition: conditionLabel(current.weather_code, current.is_day === 1),
        });
      } catch {
        setWeather((w) => ({ ...w, condition: 'unavailable' }));
      }
    }

    updateWeather();
    const id = setInterval(updateWeather, 15 * 60 * 1000); // Open-Meteo updates every 15 min
    return () => clearInterval(id);
  }, []);

  return (
    <motion.div
      ref={ref}
      className="card weather"
      aria-live="polite"
      // x / y / rotate are pushed by the pointer (see usePush.js).
      // Size is a multiplier (not a transform), so the card really resizes and
      // its containers grow with it — see .card in style.css
      style={{ '--hover-scale': 1, x, y, rotate }}
      animate={{ '--hover-scale': scale }}
      transition={transition}
    >
      <p><strong>{weather.temp}</strong> now</p>
      <p>in <strong>Bangkok</strong></p>
      <p>feels <strong>{weather.feels} {weather.condition}</strong></p>
    </motion.div>
  );
}
