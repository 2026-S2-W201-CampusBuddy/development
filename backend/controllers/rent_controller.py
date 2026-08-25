# This file is like a "Chef" — it turns raw rent data into something useful
from models.rent_model import RentModel, IS_LIVE_DATA


def get_all_areas_logic():
    areas = RentModel.get_all_areas()
    return {
        "status": "success",
        "message": "Rent areas retrieved successfully",
        "data": {
            "isLiveData": IS_LIVE_DATA,
            "areas": areas,
        },
    }


def get_area_rent_logic(area_id):
    area = RentModel.get_area_rent(area_id)
    if area is None:
        return {
            "status": "error",
            "message": f"No rent data found for area '{area_id}'",
        }, 404

    # Point out the cheapest option in this area, since students usually
    # care most about "what's the lowest realistic rent I could find here"
    cheapest = min(area["entries"], key=lambda e: e["med"])
    area["cheapestTip"] = (
        f"Cheapest typical option here: a {cheapest['dwellingType'].lower()} "
        f"({cheapest['bedrooms']} bed) at ${cheapest['med']}/week median"
    )

    return {
        "status": "success",
        "message": "Rent data retrieved successfully",
        "data": {
            "isLiveData": IS_LIVE_DATA,
            **area,
        },
    }, 200


def get_cheapest_areas_logic(limit=5):
    summary = RentModel.get_all_areas_summary()
    ranked = sorted(summary, key=lambda a: a["cheapestMedian"])[:limit]

    return {
        "status": "success",
        "message": "Cheapest areas retrieved successfully",
        "data": {
            "isLiveData": IS_LIVE_DATA,
            "ranking": ranked,
        },
    }
