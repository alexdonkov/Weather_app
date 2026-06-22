// ── App entry point: search box wiring + initial load ──

const cityInput    = document.getElementById("cityInput");
const searchButton = document.getElementById("searchButton");

// Validates the search box and kicks off a lookup.
// Relies on getWeather(), which lives in weather-api.js.
function searchCity() {
  const city = cityInput.value.trim();
  if (!city) { cityName.textContent = "Type a city"; return; }
  getWeather(city);
}

searchButton.addEventListener("click", searchCity);
cityInput.addEventListener("keydown", e => { if (e.key === "Enter") searchCity(); });

getWeather("Sofia"); // Default city shown on page load.
