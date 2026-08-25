# This file is like a "Chef" — it turns raw weather data into something useful
import random
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

# Turns weather data into a clothing suggestion. Several phrasings are
# kept per temperature band so the tip doesn't say the exact same thing
# every single day, even on days with similar weather.
COLD_TIPS = [
    "Wear a warm jacket",
    "Rug up — it's cold out there",
    "Layer up with something warm",
    "A heavy coat is a good idea today",
]

MILD_TIPS = [
    "Bring a light jacket",
    "A hoodie or cardigan should do the trick",
    "Light layers are your friend today",
    "Grab a jumper just in case",
]

WARM_TIPS = [
    "Light clothing is fine",
    "T-shirt weather — enjoy it",
    "No need for a jacket today",
    "Dress light, it's a warm one",
]

RAIN_TIPS = [
    "bring an umbrella",
    "don't forget a raincoat",
    "pack something waterproof",
    "an umbrella will save your day",
]

def suggest_clothing(temp_max, rain_chance):
    if temp_max < 12:
        base = random.choice(COLD_TIPS)
    elif temp_max < 18:
        base = random.choice(MILD_TIPS)
    else:
        base = random.choice(WARM_TIPS)

    if rain_chance >= 50:
        return f"{base}, and {random.choice(RAIN_TIPS)}"

    return base

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