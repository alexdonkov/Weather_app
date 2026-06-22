// ── Weather data: fetch from Open-Meteo, format, and render to the DOM ──

const temperature         = document.getElementById("temperature");
const cityName            = document.getElementById("cityName");
const weatherIcon         = document.getElementById("weatherIcon");
const weatherDescription  = document.getElementById("weatherDescription");
const humidity            = document.getElementById("humidity");
const wind                = document.getElementById("wind");
const uvIndex             = document.getElementById("uvIndex");
const sunrise             = document.getElementById("sunrise");
const sunset              = document.getElementById("sunset");
const precipitation       = document.getElementById("precipitation");
const forecastStrip       = document.getElementById("forecastStrip");

// Looks up a city, pulls its forecast from Open-Meteo, and refreshes the whole page.
async function getWeather(city) {
  cityName.textContent = "Loading...";

  // Turn the city name into coordinates first.
  const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`);
  const geoData = await geoRes.json();
  if (!geoData.results) { cityName.textContent = "City not found"; return; }

  const place = geoData.results[0];
  const { latitude: lat, longitude: lon } = place;

  // Request current conditions plus a 6-day daily forecast.
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,precipitation` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,sunrise,sunset,precipitation_sum` +
    `&timezone=auto&forecast_days=6`;

  const wRes = await fetch(url);
  const wData = await wRes.json();
  const cur = wData.current;
  const day = wData.daily;

  temperature.textContent   = Math.round(cur.temperature_2m) + "°";
  cityName.textContent      = place.name;
  humidity.textContent      = cur.relative_humidity_2m + "%";
  wind.textContent          = cur.wind_speed_10m + " km/h";
  uvIndex.textContent       = Math.round(day.uv_index_max[0]);
  sunrise.textContent       = formatTime(day.sunrise[0]);
  sunset.textContent        = formatTime(day.sunset[0]);
  precipitation.textContent = day.precipitation_sum[0].toFixed(1) + " mm";

  updateWeatherAppearance(cur.weather_code, cur.apparent_temperature, cur.is_day);
  renderForecast(day, 1, 5); // index 0 is today, so this shows the next 5 days
}

// Builds the forecast cards (day name, icon, high, low) for the given range of days.
function renderForecast(daily, startIdx, count) {
  forecastStrip.innerHTML = "";
  for (let i = startIdx; i < startIdx + count; i++) {
    const high = Math.round(daily.temperature_2m_max[i]);
    const low  = Math.round(daily.temperature_2m_min[i]);
    const card = document.createElement("div");
    card.className = "forecast-day";
    card.innerHTML = `
      <div class="forecast-day-name">${shortDayName(daily.time[i])}</div>
      <div class="forecast-day-icon">${codeToIcon(daily.weather_code[i])}</div>
      <div class="forecast-day-high">${high}°</div>
      <div class="forecast-day-low">${low}°</div>`;
    forecastStrip.appendChild(card);
  }
}

// Maps an Open-Meteo (WMO) weather code to a matching emoji.
function codeToIcon(code) {
  if (code === 0) return "☀️";
  if (code >= 1 && code <= 3) return "⛅";
  if (code === 45 || code === 48) return "🌫️";
  if (code >= 51 && code <= 57) return "🌦️";
  if (code >= 61 && code <= 67) return "🌧️";
  if (code >= 71 && code <= 77) return "❄️";
  if (code >= 80 && code <= 82) return "🌧️";
  if (code === 85 || code === 86) return "🌨️";
  if (code >= 95) return "⛈️";
  return "🌫️";
}

// Turns an ISO date string into a short weekday name, e.g. "Mon".
function shortDayName(dateStr) {
  const days = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
  const [y, m, d] = dateStr.split("-").map(Number);
  // Building the date from y/m/d avoids the off-by-one that new Date(dateStr) can cause across time zones.
  return days[new Date(y, m - 1, d).getDay()];
}

// Pulls just the "HH:MM" part out of an ISO datetime string.
function formatTime(iso) {
  if (!iso) return "—";
  const t = iso.split("T")[1];
  return t ? t.slice(0, 5) : "—";
}

// Sets the icon, description, and background theme to match today's weather code.
// Relies on setBackgroundTheme(), which lives in background.js.
function updateWeatherAppearance(code, feelsLike, isDay) {
  const feels = `Feels like ${Math.round(feelsLike)}°`;

  // Resetting the animation property like this restarts the icon's CSS animation.
  weatherIcon.style.animation = "none";
  weatherIcon.offsetHeight;
  weatherIcon.style.animation = "";

  if (code === 0) {
    if (isDay) { weatherIcon.textContent = "☀️"; weatherDescription.textContent = `Clear sky • ${feels}`; setBackgroundTheme("sunny"); }
    else       { weatherIcon.textContent = "🌙"; weatherDescription.textContent = `Clear night • ${feels}`; setBackgroundTheme("night-clear"); }
  } else if (code >= 1 && code <= 3) {
    weatherIcon.textContent = "⛅"; weatherDescription.textContent = `Cloudy • ${feels}`; setBackgroundTheme("cloudy");
  } else if (code === 45 || code === 48) {
    weatherIcon.textContent = "🌫️"; weatherDescription.textContent = `Foggy • ${feels}`; setBackgroundTheme("foggy");
  } else if (code >= 51 && code <= 57) {
    weatherIcon.textContent = "🌦️"; weatherDescription.textContent = `Drizzle • ${feels}`; setBackgroundTheme("rainy");
  } else if (code >= 61 && code <= 67) {
    weatherIcon.textContent = "🌧️"; weatherDescription.textContent = `Rainy • ${feels}`; setBackgroundTheme("rainy");
  } else if (code >= 71 && code <= 77) {
    weatherIcon.textContent = "❄️"; weatherDescription.textContent = `Snowy • ${feels}`; setBackgroundTheme("snowy");
  } else if (code >= 80 && code <= 82) {
    weatherIcon.textContent = "🌧️"; weatherDescription.textContent = `Rain showers • ${feels}`; setBackgroundTheme("rainy");
  } else if (code === 85 || code === 86) {
    weatherIcon.textContent = "🌨️"; weatherDescription.textContent = `Snow showers • ${feels}`; setBackgroundTheme("snowy");
  } else if (code >= 95) {
    weatherIcon.textContent = "⛈️"; weatherDescription.textContent = `Thunderstorm • ${feels}`; setBackgroundTheme("stormy");
  } else {
    weatherIcon.textContent = "🌫️"; weatherDescription.textContent = `Unknown • ${feels}`; setBackgroundTheme("foggy");
  }
}
