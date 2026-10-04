# This file is like a "Warehouse" — it provides live time data for any
# timezone in the world.
#
# We call TimeAPI.io (https://timeapi.io) — a free, no-key-required time
# API. Free time APIs are known to have occasional outages (worldtimeapi.org,
# the most commonly used alternative, currently sits around ~6% uptime per
# independent monitoring), so every call here has a strict timeout and a
# graceful fallback to Python's own built-in timezone database (zoneinfo,
# part of the standard library since Python 3.9 — no extra install needed).
# This means the feature keeps working correctly even if TimeAPI.io is
# temporarily unreachable.
import requests
from datetime import datetime
from zoneinfo import ZoneInfo
from geonamescache import GeonamesCache

TIMEAPI_URL = "https://timeapi.io/api/time/current/zone"
REQUEST_TIMEOUT_SECONDS = 3

# geonamescache bundles a real GeoNames data dump (cities with population
# 15,000+, ~34,000 cities covering every country) as installed package
# data — no download or API key needed, and no network call at request
# time. Loaded once, at import time, and kept in memory: searching 34,000
# small dicts in Python is sub-millisecond, so no database table is needed
# for this. Each city already has its own real timezone and country code
# from GeoNames directly — no more guessing a country from a timezone name.
_gc = GeonamesCache()
_COUNTRIES_BY_CODE = _gc.get_countries()
_ALL_CITIES = list(_gc.get_cities().values())


def _country_name(country_code):
    country = _COUNTRIES_BY_CODE.get(country_code)
    return country["name"] if country else country_code


class CitySearchModel:
    @staticmethod
    def search(query, limit=20):
        term = query.strip().lower()
        if not term:
            return []

        matches = []
        for city in _ALL_CITIES:
            name_lower = city["name"].lower()
            country_name_lower = _country_name(city["countrycode"]).lower()
            alt_names_lower = [a.lower() for a in city.get("alternatenames", [])]

            if (
                term in name_lower
                or term in country_name_lower
                or any(term in alt for alt in alt_names_lower)
            ):
                matches.append(city)

        # Largest/most well-known cities first — makes the right result
        # easy to find when several places share a name (e.g. "Manchester")
        matches.sort(key=lambda c: c["population"], reverse=True)

        return [
            {
                "label": city["name"],
                "country": _country_name(city["countrycode"]),
                "tz": city["timezone"],
                "population": city["population"],
            }
            for city in matches[:limit]
        ]


class WorldClockModel:
    @staticmethod
    def get_time_for_zone(tz_name):
        try:
            response = requests.get(
                TIMEAPI_URL,
                params={"timeZone": tz_name},
                timeout=REQUEST_TIMEOUT_SECONDS,
            )
            response.raise_for_status()
            data = response.json()
            return {
                "tz": tz_name,
                "time": data["time"],
                "date": data["date"],
                "dayOfWeek": data["dayOfWeek"],
                "dstActive": data["dstActive"],
                "source": "live",
            }
        except Exception:
            return WorldClockModel._fallback_time_for_zone(tz_name)

    @staticmethod
    def _fallback_time_for_zone(tz_name):
        """Used only if TimeAPI.io is down, slow, or returns bad data.
        Computed locally using Python's own timezone database, so this is
        just as accurate as the live API — it's a fallback for availability,
        not for accuracy."""
        try:
            now = datetime.now(ZoneInfo(tz_name))
            return {
                "tz": tz_name,
                "time": now.strftime("%H:%M"),
                "date": now.strftime("%m/%d/%Y"),
                "dayOfWeek": now.strftime("%A"),
                "dstActive": bool(now.dst()),
                "source": "fallback",
            }
        except Exception:
            # Truly unknown/invalid timezone name — nothing more we can do
            return {
                "tz": tz_name,
                "time": None,
                "date": None,
                "dayOfWeek": None,
                "dstActive": False,
                "source": "unavailable",
            }
