// API configuration
const API_KEY = 'edce3f5df9f895481bcde4e4998aac99';
const WEATHER_API_URL = 'https://api.openweathermap.org/data/2.5';
const GEO_API_URL = 'https://api.openweathermap.org/geo/1.0';
const AIR_POLLUTION_URL = 'https://api.openweathermap.org/data/2.5/air_pollution';
const ONE_CALL_URL = 'https://api.openweathermap.org/data/3.0/onecall';

// List of major cities for random selection
const MAJOR_CITIES = [
    'Tokyo', 'New York', 'London', 'Paris', 'Sydney', 
    'Dubai', 'Singapore', 'Hong Kong', 'Mumbai', 'Toronto',
    'Berlin', 'Madrid', 'Rome', 'Seoul', 'Bangkok'
];

// State management
let currentUnit = 'C';
let currentWeatherData = null;
let recentSearches = JSON.parse(localStorage.getItem('recentSearches')) || [];

// DOM Elements
const elements = {
    searchInput: document.getElementById("search-input"),
    searchBtn: document.querySelector(".search-btn"),
    locationBtn: document.querySelector(".location-btn"),
    temperature: document.getElementById("temperature"),
    weatherDesc: document.getElementById("weather-desc"),
    location: document.getElementById("location"),
    feelsLike: document.getElementById("feels-like"),
    humidity: document.getElementById("humidity"),
    windSpeed: document.getElementById("wind-speed"),
    pressure: document.getElementById("pressure"),
    visibility: document.getElementById("visibility"),
    sunrise: document.getElementById("sunrise-time"),
    sunset: document.getElementById("sunset-time"),
    forecastContainer: document.querySelector(".forecast-cards"),
    loadingOverlay: document.querySelector(".loading-overlay"),
    themeToggle: document.getElementById("theme-toggle-btn"),
    themeIcon: document.querySelector("#theme-toggle-btn i"),
    unitToggle: document.getElementById("unit-toggle"),
    weatherIcon: document.getElementById("weather-icon"),
    unitC: document.querySelector(".unit-c"),
    unitF: document.querySelector(".unit-f"),
    time: document.getElementById("time"),
    date: document.getElementById("date"),
    uvIndex: document.getElementById("uv-index"),
    airQuality: document.getElementById("air-quality"),
    precipitation: document.getElementById("precipitation"),
    moonPhase: document.getElementById("moon-phase"),
    tempChart: document.getElementById("tempChart"),
    graphToggles: document.querySelectorAll('.graph-toggle')
};

let tempChart = null;
let currentGraphType = 'temperature';

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    initializeTheme();
    elements.searchBtn.addEventListener('click', handleSearch);
    elements.locationBtn.addEventListener('click', handleLocationRequest);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });
    elements.themeToggle.addEventListener('click', toggleTheme);
    elements.unitToggle.addEventListener('click', toggleTemperatureUnit);
    elements.graphToggles.forEach(toggle => {
        toggle.addEventListener('click', () => {
            const type = toggle.dataset.type;
            if (type !== currentGraphType) {
                elements.graphToggles.forEach(t => t.classList.remove('active'));
                toggle.classList.add('active');
                currentGraphType = type;
                if (currentWeatherData && currentWeatherData.forecast) {
                    updateGraph(currentWeatherData.forecast);
                }
            }
        });
    });
    
    // Load default city
    getWeatherData('London');
});

// Weather Data Functions
async function getWeatherData(city) {
    showLoading();
    try {
        // Get coordinates
        const geoResponse = await fetch(`${GEO_API_URL}/direct?q=${city}&limit=1&appid=${API_KEY}`);
        const geoData = await geoResponse.json();
        
        if (!geoData.length) throw new Error('City not found');
        
        const { lat, lon } = geoData[0];
        
        // Get current weather
        const weatherResponse = await fetch(`${WEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        const weatherData = await weatherResponse.json();
        
        // Get forecast data
        const forecastResponse = await fetch(`${WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`);
        const forecastData = await forecastResponse.json();
        
        currentWeatherData = {
            current: weatherData,
            forecast: forecastData
        };
        
        updateWeatherUI(currentWeatherData);
        updateForecastUI(forecastData);
        updateGraph(forecastData);
        addToRecentSearches(city);
        
    } catch (error) {
        console.error('Error:', error);
        alert('City not found. Please try again.');
    } finally {
        hideLoading();
    }
}

async function getWeatherByCoords(lat, lon) {
    showLoading();
    try {
        // Get location name from coordinates
        const geoResponse = await fetch(
            `${GEO_API_URL}/reverse?lat=${lat}&lon=${lon}&limit=1&appid=${API_KEY}`
        );
        const geoData = await geoResponse.json();
        
        if (!geoData.length) throw new Error('Location not found');
        
        // Get weather data
        const weatherResponse = await fetch(
            `${WEATHER_API_URL}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        const weatherData = await weatherResponse.json();
        
        // Get forecast data
        const forecastResponse = await fetch(
            `${WEATHER_API_URL}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`
        );
        const forecastData = await forecastResponse.json();
        
        // Update UI
        updateWeatherUI({ current: weatherData, forecast: forecastData });
        
        // Update search input with location name
        const locationName = `${geoData[0].name}, ${geoData[0].country}`;
        elements.searchInput.value = locationName;
        addToRecentSearches(locationName);
        
    } catch (error) {
        console.error('Weather data error:', error);
        alert('Error fetching weather data. Please try again.');
    } finally {
        hideLoading();
    }
}

// UI Update Functions
function updateWeatherUI(data) {
    const { current, forecast } = data;
    
    updateWeatherIcon(current.weather[0].icon);
    elements.temperature.textContent = `${Math.round(convertTemperature(current.main.temp, currentUnit))}°${currentUnit}`;
    elements.weatherDesc.textContent = current.weather[0].description;
    elements.location.textContent = `${current.name}, ${current.sys.country}`;
    elements.feelsLike.textContent = `${Math.round(convertTemperature(current.main.feels_like, currentUnit))}°${currentUnit}`;
    elements.humidity.textContent = `${current.main.humidity}%`;
    elements.windSpeed.textContent = `${Math.round(current.wind.speed * 3.6)} km/h`;
    elements.pressure.textContent = `${current.main.pressure} hPa`;
    elements.visibility.textContent = `${(current.visibility / 1000).toFixed(1)} km`;
    
    // Update sunrise and sunset times
    const sunriseTime = new Date(current.sys.sunrise * 1000);
    const sunsetTime = new Date(current.sys.sunset * 1000);
    elements.sunrise.textContent = sunriseTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    elements.sunset.textContent = sunsetTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    
    // Update forecast
    updateForecastUI(forecast);
}

function updateForecastUI(forecastData) {
    if (!elements.forecastContainer) return;

    // Group forecast by day and get the first entry for each day (excluding today)
    const dailyForecasts = forecastData.list.reduce((acc, forecast) => {
        const date = new Date(forecast.dt * 1000);
        const dateStr = date.toLocaleDateString();
        
        if (!acc[dateStr] && date.getDate() !== new Date().getDate()) {
            acc[dateStr] = {
                date: date,
                icon: forecast.weather[0].icon,
                temp_max: forecast.main.temp_max,
                temp_min: forecast.main.temp_min,
                description: forecast.weather[0].description
            };
        } else if (acc[dateStr]) {
            // Update max and min temperatures
            acc[dateStr].temp_max = Math.max(acc[dateStr].temp_max, forecast.main.temp_max);
            acc[dateStr].temp_min = Math.min(acc[dateStr].temp_min, forecast.main.temp_min);
        }
        return acc;
    }, {});

    // Convert to array and take first 5 days
    const forecasts = Object.values(dailyForecasts).slice(0, 5);

    const forecastHTML = forecasts.map(day => `
        <div class="forecast-card" title="${day.description}">
            <div class="forecast-date">
                <span>${day.date.toLocaleDateString('en-US', { weekday: 'short' })}</span>
                <span>${day.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
            </div>
            <img src="https://openweathermap.org/img/wn/${day.icon}@2x.png" 
                 alt="${day.description}"
                 loading="lazy">
            <div class="forecast-temps">
                <div class="max-temp">
                    ${Math.round(convertTemperature(day.temp_max, currentUnit))}°
                </div>
                <div class="min-temp">
                    ${Math.round(convertTemperature(day.temp_min, currentUnit))}°
                </div>
            </div>
        </div>
    `).join('');

    elements.forecastContainer.innerHTML = forecastHTML;
}

function updateWeatherIcon(iconCode) {
    const weatherIcon = document.getElementById('weather-icon');
    if (weatherIcon) {
        weatherIcon.src = `https://openweathermap.org/img/wn/${iconCode}@2x.png`;
    }
}

// Temperature Conversion
function convertTemperature(temp, unit) {
    return unit === 'F' ? (temp * 9/5) + 32 : temp;
}

function toggleTemperatureUnit() {
    currentUnit = currentUnit === 'C' ? 'F' : 'C';
    elements.unitC.classList.toggle('active');
    elements.unitF.classList.toggle('active');
    
    if (currentWeatherData) {
        updateWeatherUI(currentWeatherData);
    }
}

// Theme Management
function initializeTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';
    
    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    elements.themeIcon.className = theme === 'light' ? 'fas fa-moon' : 'fas fa-sun';
}

// Loading State Management
function showLoading() {
    elements.loadingOverlay.style.display = 'flex';
}

function hideLoading() {
    elements.loadingOverlay.style.display = 'none';
}

// Search Handling
async function handleSearch() {
    const city = elements.searchInput.value.trim();
    if (city) {
        await getWeatherData(city);
    }
}

// Geolocation Functions
async function handleLocationRequest() {
    const locationBtn = elements.locationBtn;
    locationBtn.classList.add('loading');
    
    try {
        // Check if geolocation is supported
        if (!navigator.geolocation) {
            throw new Error('Geolocation is not supported by your browser');
        }

        // Get current position
        const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
                enableHighAccuracy: true,
                timeout: 5000,
                maximumAge: 0
            });
        });

        // Get weather for current location
        const { latitude, longitude } = position.coords;
        await getWeatherByCoords(latitude, longitude);
        
    } catch (error) {
        console.error('Location error:', error);
        alert('Unable to get your location. Please try searching for your city instead.');
    } finally {
        locationBtn.classList.remove('loading');
    }
}

// Recent Searches Management
function addToRecentSearches(city) {
    if (!recentSearches.includes(city)) {
        recentSearches.unshift(city);
        if (recentSearches.length > 5) {
            recentSearches.pop();
        }
    }
}

// Update time and date
function updateDateTime() {
    const now = new Date();
    const timeElement = document.getElementById("time");
    const dateElement = document.getElementById("date");

    timeElement.textContent = now.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
    });

    dateElement.textContent = now.toLocaleDateString('en-US', { 
        weekday: 'long',
        day: 'numeric',
        month: 'long'
    });
}

setInterval(updateDateTime, 1000);
updateDateTime();

// New function to update extended weather information
function updateExtendedInfo(data) {
    const { extended, airQuality } = data;
    
    // Update UV Index
    const uvIndex = extended.current.uvi;
    elements.uvIndex.textContent = uvIndex.toFixed(1);
    
    // Update Air Quality
    const aqi = airQuality.list[0].main.aqi;
    const aqiLabels = {
        1: 'Good',
        2: 'Fair',
        3: 'Moderate',
        4: 'Poor',
        5: 'Very Poor'
    };
    elements.airQuality.textContent = aqiLabels[aqi];
    
    // Update Precipitation
    const precipitation = extended.hourly[0].pop * 100;
    elements.precipitation.textContent = `${precipitation.toFixed(0)}%`;
    
    // Update Moon Phase
    const moonPhase = extended.daily[0].moon_phase;
    const moonPhaseLabel = getMoonPhaseLabel(moonPhase);
    elements.moonPhase.textContent = moonPhaseLabel;
}

// Helper function to get moon phase label
function getMoonPhaseLabel(phase) {
    if (phase === 0 || phase === 1) return 'New Moon';
    if (phase < 0.25) return 'Waxing Crescent';
    if (phase === 0.25) return 'First Quarter';
    if (phase < 0.5) return 'Waxing Gibbous';
    if (phase === 0.5) return 'Full Moon';
    if (phase < 0.75) return 'Waning Gibbous';
    if (phase === 0.75) return 'Last Quarter';
    return 'Waning Crescent';
}

// Function to create and update graphs
function updateGraph(forecastData) {
    const hourlyData = forecastData.list.slice(0, 24);
    
    const labels = hourlyData.map(item => {
        const date = new Date(item.dt * 1000);
        return date.getHours() + ':00';
    });

    // Format time labels for each hour (available for all graph types)
    const timeLabels = hourlyData.map((item, index) => {
        if (index === 0) return 'Now';
        const date = new Date(item.dt * 1000);
        return date.getHours() + ' ' + (date.getHours() >= 12 ? 'PM' : 'AM');
    });

    let dataset;
    let chartConfig;

    switch (currentGraphType) {
        case 'temperature':
            dataset = {
                label: 'Temperature (°C)',
                data: hourlyData.map(item => item.main.temp),
                borderColor: '#ff6b6b',
                backgroundColor: (context) => {
                    const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(255, 107, 107, 0.5)');
                    gradient.addColorStop(1, 'rgba(255, 107, 107, 0)');
                    return gradient;
                },
                tension: 0.4,
                fill: true
            };
            break;
        case 'humidity':
            const averageHumidity = Math.round(
                hourlyData.reduce((sum, item) => sum + item.main.humidity, 0) / hourlyData.length
            );
            
            dataset = {
                label: 'Humidity (%)',
                data: hourlyData.map(item => item.main.humidity),
                backgroundColor: (context) => {
                    const ctx = context.chart.ctx;
                    const gradient = ctx.createLinearGradient(0, 0, 0, context.chart.height);
                    gradient.addColorStop(0, 'rgba(255, 187, 51, 1)');     // Even brighter orange at top
                    gradient.addColorStop(1, 'rgba(255, 187, 51, 0.6)');   // Brighter fade at bottom
                    return gradient;
                },
                borderRadius: {
                    topLeft: 20,
                    topRight: 20,
                    bottomLeft: 20,
                    bottomRight: 20
                },
                borderSkipped: false,
                barPercentage: 0.7,    // Thicker bars
                categoryPercentage: 0.95, // Minimal spacing
                maxBarThickness: 35
            };
            break;
        case 'rain':
            dataset = {
                label: 'Rain (mm)',
                data: hourlyData.map(item => (item.rain?.['3h'] || 0)),
                borderColor: '#4facfe',
                backgroundColor: (context) => {
                    const gradient = context.chart.ctx.createLinearGradient(0, 0, 0, 300);
                    gradient.addColorStop(0, 'rgba(79, 172, 254, 0.5)');
                    gradient.addColorStop(1, 'rgba(79, 172, 254, 0)');
                    return gradient;
                },
                tension: 0.4,
                fill: true
            };
            break;
    }

    chartConfig = {
        type: currentGraphType === 'humidity' ? 'bar' : 'line',
        data: {
            labels: currentGraphType === 'humidity' ? timeLabels : labels,
            datasets: [dataset]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            layout: {
                padding: currentGraphType === 'humidity' ? {
                    top: 30,
                    right: 20
                } : {
                    top: 10
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: currentGraphType !== 'humidity',
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    borderWidth: 1,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                switch(currentGraphType) {
                                    case 'temperature':
                                        label += Math.round(context.parsed.y) + '°C';
                                        break;
                                    case 'humidity':
                                        label += context.parsed.y + '%';
                                        break;
                                    case 'rain':
                                        label += context.parsed.y + 'mm';
                                        break;
                                }
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                y: {
                    display: currentGraphType !== 'humidity',
                    beginAtZero: true,
                    max: currentGraphType === 'humidity' ? 100 : undefined,
                    grid: {
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: getComputedStyle(document.documentElement).getPropertyValue('--text-color').trim(),
                        callback: function(value) {
                            switch(currentGraphType) {
                                case 'temperature':
                                    return value + '°C';
                                case 'humidity':
                                    return value + '%';
                                case 'rain':
                                    return value + 'mm';
                                default:
                                    return value;
                            }
                        }
                    }
                },
                x: {
                    grid: {
                        display: currentGraphType !== 'humidity',
                        color: 'rgba(255, 255, 255, 0.1)'
                    },
                    ticks: {
                        color: '#ffffff',
                        font: {
                            size: 12,
                            family: 'Poppins'
                        },
                        maxRotation: 0,
                        minRotation: 0
                    }
                }
            }
        }
    };

    if (tempChart) {
        tempChart.destroy();
    }
    
    tempChart = new Chart(elements.tempChart, chartConfig);
}

// Register Service Worker
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('ServiceWorker registration successful');
            })
            .catch(err => {
                console.log('ServiceWorker registration failed: ', err);
            });
    });
}

// PWA Install Prompt
let deferredPrompt;
const installPrompt = document.getElementById('install-prompt');
const installButton = document.getElementById('install-button');
const closePromptButton = document.getElementById('close-prompt');

window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent Chrome 67 and earlier from automatically showing the prompt
    e.preventDefault();
    // Stash the event so it can be triggered later
    deferredPrompt = e;
    // Show the install prompt
    installPrompt.style.display = 'block';
});

installButton.addEventListener('click', async () => {
    if (deferredPrompt) {
        // Show the install prompt
        deferredPrompt.prompt();
        // Wait for the user to respond to the prompt
        const { outcome } = await deferredPrompt.userChoice;
        // We no longer need the prompt
        deferredPrompt = null;
        // Hide the install prompt
        installPrompt.style.display = 'none';
    }
});

closePromptButton.addEventListener('click', () => {
    installPrompt.style.display = 'none';
    // Optionally, store in localStorage to not show again for some time
    localStorage.setItem('installPromptClosed', Date.now());
});

// Check if we should show the install prompt
const shouldShowPrompt = () => {
    const lastClosed = localStorage.getItem('installPromptClosed');
    if (!lastClosed) return true;
    // Show again after 7 days
    const daysSinceClosed = (Date.now() - parseInt(lastClosed)) / (1000 * 60 * 60 * 24);
    return daysSinceClosed >= 7;
};