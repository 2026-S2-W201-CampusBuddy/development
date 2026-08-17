# This file is like a "Warehouse" — it fetches weather data from Open-Meteo
import requests

# Auckland's coordinates
AUCKLAND_LAT = -36.8485
AUCKLAND_LON = 174.7633

class WeatherModel:
    @staticmethod
    def get_auckland_forecast():
        # Open-Meteo is free and needs no API key
        url = "https://api.open-meteo.com/v1/forecast"
        params = {
            "latitude": AUCKLAND_LAT,
            "longitude": AUCKLAND_LON,
            "current": "temperature_2m,weather_code,wind_speed_10m",
            "daily": "temperature_2m_max,temperature_2m_min,precipitation_probability_max",
            "timezone": "Pacific/Auckland"
        }

        response = requests.get(url, params=params, timeout=5)
        response.raise_for_status()  # raises an error if the request failed
        data = response.json()

        current = data["current"]
        daily = data["daily"]

        return {
            "current_temp": current["temperature_2m"],
            "weather_code": current["weather_code"],
            "wind_speed": current["wind_speed_10m"],
            "today_max": daily["temperature_2m_max"][0],
            "today_min": daily["temperature_2m_min"][0],
            "rain_chance": daily["precipitation_probability_max"][0]
        }