# This file is like a "Chef" — it turns raw weather data into something useful
from models.weather_model import WeatherModel

# Weather codes from Open-Meteo (WMO standard), simplified into plain English
def describe_weather_code(code):
    if code == 0:
        return "Clear sky"
    elif code in [1, 2, 3]:
        return "Partly cloudy"
    elif code in [45, 48]:
        return "Foggy"
    elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
        return "Rainy"
    elif code in [71, 73, 75, 85, 86]:
        return "Snowy"
    elif code in [95, 96, 99]:
        return "Thunderstorm"
    else:
        return "Unknown"

# Matches a weather code to an emoji icon, so the frontend doesn't need
# to duplicate this mapping logic itself
def get_weather_icon(code):
    if code == 0:
        return "☀️"
    elif code in [1, 2, 3]:
        return "⛅"
    elif code in [45, 48]:
        return "🌫️"
    elif code in [51, 53, 55, 61, 63, 65, 80, 81, 82]:
        return "🌧️"
    elif code in [71, 73, 75, 85, 86]:
        return "❄️"
    elif code in [95, 96, 99]:
        return "⛈️"
    else:
        return "🌡️"

# Turns weather data into a clothing suggestion
def suggest_clothing(temp_max, rain_chance):
    suggestion = []

    if temp_max < 12:
        suggestion.append("wear a warm jacket")
    elif temp_max < 18:
        suggestion.append("bring a light jacket")
    else:
        suggestion.append("light clothing is fine")

    if rain_chance >= 50:
        suggestion.append("bring an umbrella")

    return ", ".join(suggestion).capitalize()

def get_auckland_weather_logic():
    forecast = WeatherModel.get_auckland_forecast()

    weather_description = describe_weather_code(forecast["weather_code"])
    weather_icon = get_weather_icon(forecast["weather_code"])
    clothing_tip = suggest_clothing(forecast["today_max"], forecast["rain_chance"])

    return {
        "status": "success",
        "message": "Auckland weather retrieved successfully",
        "data": {
            "current_temp": forecast["current_temp"],
            "today_max": forecast["today_max"],
            "today_min": forecast["today_min"],
            "rain_chance": forecast["rain_chance"],
            "wind_speed": forecast["wind_speed"],
            "condition": weather_description,
            "icon": weather_icon,
            "clothing_tip": clothing_tip
        }
    }