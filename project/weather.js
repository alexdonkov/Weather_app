// ── DOM references ──
const cityInput        = document.getElementById("cityInput");
const searchButton     = document.getElementById("searchButton");
const temperature      = document.getElementById("temperature");
const cityName         = document.getElementById("cityName");
const weatherIcon      = document.getElementById("weatherIcon");
const weatherDescription = document.getElementById("weatherDescription");
const humidity         = document.getElementById("humidity");
const wind             = document.getElementById("wind");
const uvIndex          = document.getElementById("uvIndex");
const sunrise          = document.getElementById("sunrise");
const sunset           = document.getElementById("sunset");
const precipitation    = document.getElementById("precipitation");
const forecastStrip    = document.getElementById("forecastStrip");
const canvas           = document.getElementById("bgCanvas");
const ctx              = canvas.getContext("2d");

// Each weather type has its own gradient and particle style.
const THEMES = {
  sunny:        { from: "#0a3d6b", to: "#74c0e8", particle: "circle",    color: "rgba(255,220,50,0.35)"  },
  cloudy:       { from: "#2d3748", to: "#718096", particle: "circle",    color: "rgba(200,210,220,0.25)" },
  rainy:        { from: "#0d1f2d", to: "#2d5a6b", particle: "raindrop",  color: "rgba(100,180,220,0.45)" },
  stormy:       { from: "#0a0a1a", to: "#2d2d5e", particle: "lightning", color: "rgba(160,140,255,0.5)"  },
  snowy:        { from: "#5a7fa0", to: "#c8e0f0", particle: "snowflake", color: "rgba(220,240,255,0.7)"  },
  foggy:        { from: "#3d4550", to: "#8d9aaa", particle: "circle",    color: "rgba(180,190,200,0.2)"  },
  "night-clear":{ from: "#060412", to: "#1a1060", particle: "star",      color: "rgba(255,255,255,0.8)"  },
};

// currentFrom/currentTo are the colors on screen right now.
// targetFrom/targetTo are where the theme is heading. animate() eases between them.
let currentFrom = hexToRgb("#0a3d6b");
let currentTo   = hexToRgb("#74c0e8");
let targetFrom  = { ...currentFrom };
let targetTo    = { ...currentTo };
let lerpSpeed   = 0.018;

let activeParticleType  = "circle";
let activeParticleColor = "rgba(255,220,50,0.35)";

// Converts a hex string like "#0a3d6b" into an {r, g, b} object.
function hexToRgb(hex) {
  return {
    r: parseInt(hex.slice(1, 3), 16),
    g: parseInt(hex.slice(3, 5), 16),
    b: parseInt(hex.slice(5, 7), 16),
  };
}
function lerp(a, b, t) { return a + (b - a) * t; }
function rgbStr(c) { return `rgb(${Math.round(c.r)},${Math.round(c.g)},${Math.round(c.b)})`; }

// Switches the active theme. The colors don't jump instantly; animate() fades into them.
function setBackgroundTheme(name) {
  const t = THEMES[name] || THEMES.sunny;
  targetFrom          = hexToRgb(t.from);
  targetTo            = hexToRgb(t.to);
  activeParticleType  = t.particle;
  activeParticleColor = t.color;
}

// ── Particles ──
const PARTICLE_COUNT = 55;
let particles = [];

// Builds one particle with randomized position, size, speed, and rotation.
function createParticle() {
  return {
    x: Math.random() * canvas.width,
    y: Math.random() * canvas.height,
    size: Math.random() * 3 + 1,
    speedX: (Math.random() - 0.5) * 0.6,
    speedY: Math.random() * 0.8 + 0.2,
    opacity: Math.random() * 0.6 + 0.2,
    angle: Math.random() * Math.PI * 2,
    spin: (Math.random() - 0.5) * 0.04,
  };
}

// Rebuilds the whole particle pool. Runs on load and on window resize.
function initParticles() {
  particles = [];
  for (let i = 0; i < PARTICLE_COUNT; i++) particles.push(createParticle());
}

// Renders one particle based on the current weather's particle type.
function drawParticle(p, type, color) {
  ctx.save();
  ctx.globalAlpha = p.opacity;
  ctx.fillStyle = color;
  ctx.strokeStyle = color;

  if (type === "raindrop") {
    // A short streak that falls down and slightly to the left.
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x - 1, p.y + p.size * 6);
    ctx.stroke();
  } else if (type === "snowflake") {
    // Six spokes drawn 60 degrees apart, rotated over time.
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);
    ctx.lineWidth = 1;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(0, p.size * 3.5);
      ctx.stroke();
      ctx.rotate(Math.PI / 3);
    }
  } else if (type === "star") {
    // A glowing dot that twinkles; the opacity pulse happens in updateParticle.
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.7, 0, Math.PI * 2);
    ctx.fill();
  } else if (type === "lightning") {
    // Small glowing dots that drift around during a storm.
    ctx.shadowColor = "#a080ff";
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
    ctx.fill();
  } else {
    // Plain soft circle, used for sunny, cloudy, and foggy themes.
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

// Moves one particle a step forward, then wraps it around if it leaves the canvas.
function updateParticle(p, type) {
  if (type === "raindrop") {
    p.y += 6 + p.size; p.x -= 0.5;
  } else if (type === "snowflake") {
    p.y += 0.6 + p.size * 0.2; p.x += Math.sin(p.angle) * 0.5; p.angle += p.spin;
  } else if (type === "star") {
    p.opacity = 0.3 + Math.abs(Math.sin(Date.now() * 0.001 + p.x)) * 0.6; p.y += 0.05;
  } else if (type === "lightning") {
    p.y += 0.3; p.x += (Math.random() - 0.5) * 0.4;
  } else {
    p.y -= p.speedY * 0.6; p.x += p.speedX;
  }

  // Send the particle to the opposite edge once it drifts off screen.
  if (p.y > canvas.height + 20) { p.y = -20; p.x = Math.random() * canvas.width; }
  if (p.y < -20)                { p.y = canvas.height + 20; }
  if (p.x > canvas.width + 20)  { p.x = -20; }
  if (p.x < -20)                { p.x = canvas.width + 20; }
}

let lightningTimer = 0;

// During a storm, flashes the whole canvas white every couple of seconds to fake lightning.
function maybeFlash() {
  if (activeParticleType !== "lightning") return;
  if (--lightningTimer <= 0) {
    ctx.save();
    ctx.globalAlpha = Math.random() * 0.12;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    lightningTimer = 120 + Math.random() * 240; // next flash lands roughly 2-6 seconds later
  }
}

// Keeps the canvas sized to the full window.
function resizeCanvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}

// Runs once per frame. Eases the gradient toward its target, paints it, then draws particles.
function animate() {
  requestAnimationFrame(animate);

  currentFrom.r = lerp(currentFrom.r, targetFrom.r, lerpSpeed);
  currentFrom.g = lerp(currentFrom.g, targetFrom.g, lerpSpeed);
  currentFrom.b = lerp(currentFrom.b, targetFrom.b, lerpSpeed);
  currentTo.r   = lerp(currentTo.r, targetTo.r, lerpSpeed);
  currentTo.g   = lerp(currentTo.g, targetTo.g, lerpSpeed);
  currentTo.b   = lerp(currentTo.b, targetTo.b, lerpSpeed);

  const grad = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
  grad.addColorStop(0, rgbStr(currentFrom));
  grad.addColorStop(1, rgbStr(currentTo));
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  for (const p of particles) {
    drawParticle(p, activeParticleType, activeParticleColor);
    updateParticle(p, activeParticleType);
  }
  maybeFlash();
}

resizeCanvas();
initParticles();
animate();
window.addEventListener("resize", () => { resizeCanvas(); initParticles(); });

// ── Fetch weather ──

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

// Validates the search box and kicks off a lookup.
function searchCity() {
  const city = cityInput.value.trim();
  if (!city) { cityName.textContent = "Type a city"; return; }
  getWeather(city);
}

searchButton.addEventListener("click", searchCity);
cityInput.addEventListener("keydown", e => { if (e.key === "Enter") searchCity(); });

getWeather("Sofia"); // Default city shown on page load.
