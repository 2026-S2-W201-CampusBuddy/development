# This file is like a "Chef" — it turns a list of requested timezones
# into a combined, ready-to-use response.
from models.worldclock_model import WorldClockModel

AUCKLAND_TZ = "Pacific/Auckland"


def get_world_clock_logic(requested_zones):
    # Auckland is always included, first, regardless of what was requested —
    # it's the one city every CampusBuddy user cares about by definition.
    zones_to_fetch = [AUCKLAND_TZ] + [z for z in requested_zones if z != AUCKLAND_TZ]

    results = {}
    for tz in zones_to_fetch:
        results[tz] = WorldClockModel.get_time_for_zone(tz)

    any_fallback = any(r["source"] == "fallback" for r in results.values())

    return {
        "status": "success",
        "message": "World clock times retrieved",
        "data": {
            "zones": results,
            "usedFallback": any_fallback,
        },
    }
