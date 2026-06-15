// ── DOM references ──────────────────────────────────────────────────────────
let cityInput = document.getElementById("cityInput");
let searchButton = document.getElementById("searchButton");

// Main display elements
let temperature = document.getElementById("temperature");
let cityName = document.getElementById("cityName");
let weatherIcon = document.getElementById("weatherIcon");
let weatherDescription = document.getElementById("weatherDescription");

// Primary stat cards
let humidity = document.getElementById("humidity");
let wind = document.getElementById("wind");
let uvIndex = document.getElementById("uvIndex");

// Secondary stat cards (new)
let sunrise = document.getElementById("sunrise");
let sunset = document.getElementById("sunset");
let precipitation = document.getElementById("precipitation");

// ── Fetch weather data ───────────────────────────────────────────────────────
async function getWeather(city) {
  cityName.textContent = "Loading...";

  // Step 1: Geocode the city name to lat/lon using the Open-Meteo geocoding API
  let geoUrl = "https://geocoding-api.open-meteo.com/v1/search?name=" + city + "&count=1";

  let geoResponse = await fetch(geoUrl);
  let geoData = await geoResponse.json();

  // If no results were found, tell the user and stop
  if (!geoData.results) {
    cityName.textContent = "City not found";
    return;
  }

  let place = geoData.results[0];

  let lat = place.latitude;
  let lon = place.longitude;

  // Step 2: Fetch current weather data from the Open-Meteo forecast API.
  // We request current conditions plus daily values for today (UV, sunrise, sunset, precipitation).
  let weatherUrl =
    "https://api.open-meteo.com/v1/forecast?latitude=" + lat +
    "&longitude=" + lon +
    "&current=temperature_2m,apparent_temperature,relative_humidity_2m,wind_speed_10m,weather_code,is_day,precipitation" +
    "&daily=uv_index_max,sunrise,sunset,precipitation_sum" +
    "&timezone=auto";

  let weatherResponse = await fetch(weatherUrl);
  let weatherData = await weatherResponse.json();

  // ── Extract current values ────────────────────────────────────────────────
  let temp        = weatherData.current.temperature_2m;
  let feelsLike   = weatherData.current.apparent_temperature;
  let hum         = weatherData.current.relative_humidity_2m;
  let windSpeed   = weatherData.current.wind_speed_10m;
  let code        = weatherData.current.weather_code;
  let isDay       = weatherData.current.is_day;   // 1 = daytime, 0 = nighttime
  let precip      = weatherData.current.precipitation;

  // ── Extract daily values (index 0 = today) ────────────────────────────────
  let uv          = weatherData.daily.uv_index_max[0];
  let sunriseISO  = weatherData.daily.sunrise[0];   // ISO datetime string e.g. "2024-06-15T05:42"
  let sunsetISO   = weatherData.daily.sunset[0];
  let precipSum   = weatherData.daily.precipitation_sum[0];  // mm for the full day

  // ── Update the UI ─────────────────────────────────────────────────────────
  cityName.textContent    = place.name;
  temperature.textContent = Math.round(temp) + "°";
  humidity.textContent    = hum + "%";
  wind.textContent        = windSpeed + " km/h";
  uvIndex.textContent     = Math.round(uv);

  // Format sunrise and sunset times — strip the date part, keep "HH:MM"
  sunrise.textContent = formatTime(sunriseISO);
  sunset.textContent  = formatTime(sunsetISO);

  // Show today's total precipitation in mm (current precipitation is per-hour)
  precipitation.textContent = precipSum.toFixed(1) + " mm";

  // Step 3: Apply the correct weather icon, description, and background theme
  updateWeatherAppearance(code, feelsLike, isDay);
}

// ── Helper: extract HH:MM from an ISO datetime string ───────────────────────
// e.g. "2024-06-15T05:42" → "05:42"
function formatTime(isoString) {
  if (!isoString) return "—";
  let parts = isoString.split("T");
  return parts[1] ? parts[1].slice(0, 5) : "—";
}

// ── Update icon, description, and body colour theme based on weather code ───
// WMO Weather Interpretation Codes (WW):
//   0 = Clear sky
//   1, 2, 3 = Mainly clear, partly cloudy, overcast
//   45, 48 = Fog and depositing rime fog
//   51, 53, 55 = Drizzle: Light, moderate, dense
//   56, 57 = Freezing drizzle
//   61, 63, 65 = Rain: Slight, moderate, heavy
//   66, 67 = Freezing rain
//   71, 73, 75 = Snow: Slight, moderate, heavy
//   77 = Snow grains
//   80, 81, 82 = Rain showers: Slight, moderate, violent
//   85, 86 = Snow showers: Slight, heavy
//   95 = Thunderstorm
//   96, 99 = Thunderstorm with hail
function updateWeatherAppearance(code, feelsLike, isDay) {
  // Remove any existing theme class before applying a fresh one
  document.body.className = "";

  let feels = "Feels like " + Math.round(feelsLike) + "°";

  if (code === 0) {
    // Clear sky — appearance differs between day and night
    if (isDay) {
      weatherIcon.textContent        = "☀️";
      weatherDescription.textContent = "Clear sky • " + feels;
      // Default body gradient is already sunny — no class needed
    } else {
      weatherIcon.textContent        = "🌙";
      weatherDescription.textContent = "Clear night • " + feels;
      document.body.classList.add("theme-night-clear");
    }
  }
  else if (code >= 1 && code <= 3) {
    // Mainly clear → partly cloudy → overcast
    weatherIcon.textContent        = "⛅";
    weatherDescription.textContent = "Cloudy • " + feels;
    document.body.classList.add("theme-cloudy");
  }
  else if (code === 45 || code === 48) {
    // Fog or depositing rime fog
    weatherIcon.textContent        = "🌫️";
    weatherDescription.textContent = "Foggy • " + feels;
    document.body.classList.add("theme-foggy");
  }
  else if (code >= 51 && code <= 57) {
    // Drizzle (light through freezing)
    weatherIcon.textContent        = "🌦️";
    weatherDescription.textContent = "Drizzle • " + feels;
    document.body.classList.add("theme-rainy");
  }
  else if (code >= 61 && code <= 67) {
    // Rain (slight to heavy, including freezing)
    weatherIcon.textContent        = "🌧️";
    weatherDescription.textContent = "Rainy • " + feels;
    document.body.classList.add("theme-rainy");
  }
  else if (code >= 71 && code <= 77) {
    // Snow fall and snow grains
    weatherIcon.textContent        = "❄️";
    weatherDescription.textContent = "Snowy • " + feels;
    document.body.classList.add("theme-snowy");
  }
  else if (code >= 80 && code <= 82) {
    // Rain showers (slight to violent)
    weatherIcon.textContent        = "🌧️";
    weatherDescription.textContent = "Rain showers • " + feels;
    document.body.classList.add("theme-rainy");
  }
  else if (code === 85 || code === 86) {
    // Snow showers (slight to heavy)
    weatherIcon.textContent        = "🌨️";
    weatherDescription.textContent = "Snow showers • " + feels;
    document.body.classList.add("theme-snowy");
  }
  else if (code >= 95) {
    // Thunderstorm (with or without hail)
    weatherIcon.textContent        = "⛈️";
    weatherDescription.textContent = "Thunderstorm • " + feels;
    document.body.classList.add("theme-stormy");
  }
  else {
    // Fallback for any unrecognised WMO code
    weatherIcon.textContent        = "🌫️";
    weatherDescription.textContent = "Unknown • " + feels;
    document.body.classList.add("theme-foggy");
  }
}

// ── Handle search ────────────────────────────────────────────────────────────
function searchCity() {
  let city = cityInput.value.trim();

  // Do nothing if the input is blank
  if (city === "") {
    cityName.textContent = "Type a city";
    return;
  }

  getWeather(city);
}

// ── Event listeners ──────────────────────────────────────────────────────────

// Trigger search on button click
searchButton.addEventListener("click", searchCity);

// Also allow pressing Enter in the text input
cityInput.addEventListener("keydown", function(event) {
  if (event.key === "Enter") {
    searchCity();
  }
});

// ── Load a default city when the page first opens ────────────────────────────
getWeather("Sofia");
