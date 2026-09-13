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

TIMEAPI_URL = "https://timeapi.io/api/time/current/zone"
REQUEST_TIMEOUT_SECONDS = 3


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
