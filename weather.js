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

async function updateWeather() {
  const card = document.getElementById('weather-card');
  try {
    const res = await fetch(WEATHER_URL);
    if (!res.ok) throw new Error(res.status);
    const { current } = await res.json();

    card.querySelector('[data-temp]').textContent = `${current.temperature_2m.toFixed(1)}°C`;
    card.querySelector('[data-feels]').textContent = `${Math.round(current.apparent_temperature)}°C`;
    card.querySelector('[data-condition]').textContent =
      conditionLabel(current.weather_code, current.is_day === 1);
  } catch {
    card.querySelector('[data-condition]').textContent = 'unavailable';
  }
}

updateWeather();
setInterval(updateWeather, 15 * 60 * 1000); // Open-Meteo updates every 15 min
