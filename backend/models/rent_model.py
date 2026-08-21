# This file is like a "Warehouse" — it provides Auckland rent data.
#
# STATUS: Using realistic MOCK data for now, while our subscription to
# MBIE's official Market Rent API (https://api.business.govt.nz) is
# pending approval.
#
# The field names below (lq, med, uq, dwellingType, bedrooms, activeBonds)
# deliberately match MBIE's real API response fields exactly. Once our
# subscription is approved, only the get_area_rent() and get_all_areas()
# functions in this file need to change — everything in controllers/
# and routes/ stays exactly the same, since they just consume whatever
# this file returns.

DATA_AS_OF = "01 Feb 2026 - 31 Jul 2026"  # mirrors MBIE's 6-month reporting window
IS_LIVE_DATA = False  # flip to True once real API integration replaces the mock below

# Areas chosen for relevance to Auckland students — close to AUT City,
# University of Auckland, and popular flatting suburbs.
_MOCK_AREAS = {
    "auckland-cbd": {
        "label": "Auckland CBD",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 210, "lq": 260, "med": 320, "uq": 380},
            {"dwellingType": "Apartment", "bedrooms": "1", "activeBonds": 890, "lq": 480, "med": 560, "uq": 650},
            {"dwellingType": "Apartment", "bedrooms": "2", "activeBonds": 640, "lq": 620, "med": 720, "uq": 830},
        ],
    },
    "grafton": {
        "label": "Grafton",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 96, "lq": 240, "med": 290, "uq": 340},
            {"dwellingType": "Apartment", "bedrooms": "1", "activeBonds": 150, "lq": 430, "med": 500, "uq": 570},
            {"dwellingType": "House", "bedrooms": "3", "activeBonds": 60, "lq": 640, "med": 710, "uq": 790},
        ],
    },
    "mount-eden": {
        "label": "Mount Eden",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 78, "lq": 230, "med": 280, "uq": 330},
            {"dwellingType": "Flat", "bedrooms": "2", "activeBonds": 210, "lq": 480, "med": 540, "uq": 600},
            {"dwellingType": "House", "bedrooms": "3", "activeBonds": 180, "lq": 650, "med": 720, "uq": 800},
        ],
    },
    "epsom": {
        "label": "Epsom",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 60, "lq": 235, "med": 285, "uq": 335},
            {"dwellingType": "Flat", "bedrooms": "2", "activeBonds": 165, "lq": 500, "med": 560, "uq": 620},
            {"dwellingType": "House", "bedrooms": "3", "activeBonds": 150, "lq": 680, "med": 750, "uq": 830},
        ],
    },
    "kingsland": {
        "label": "Kingsland",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 54, "lq": 225, "med": 275, "uq": 320},
            {"dwellingType": "Flat", "bedrooms": "2", "activeBonds": 140, "lq": 470, "med": 530, "uq": 590},
            {"dwellingType": "House", "bedrooms": "3", "activeBonds": 120, "lq": 630, "med": 700, "uq": 780},
        ],
    },
    "mount-albert": {
        "label": "Mount Albert",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 66, "lq": 215, "med": 260, "uq": 305},
            {"dwellingType": "Flat", "bedrooms": "2", "activeBonds": 175, "lq": 440, "med": 500, "uq": 555},
            {"dwellingType": "House", "bedrooms": "3", "activeBonds": 200, "lq": 590, "med": 650, "uq": 720},
        ],
    },
    "newmarket": {
        "label": "Newmarket",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 45, "lq": 250, "med": 300, "uq": 350},
            {"dwellingType": "Apartment", "bedrooms": "1", "activeBonds": 300, "lq": 460, "med": 530, "uq": 600},
            {"dwellingType": "Apartment", "bedrooms": "2", "activeBonds": 220, "lq": 590, "med": 670, "uq": 750},
        ],
    },
    "parnell": {
        "label": "Parnell",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 30, "lq": 260, "med": 310, "uq": 360},
            {"dwellingType": "Apartment", "bedrooms": "1", "activeBonds": 180, "lq": 500, "med": 580, "uq": 660},
            {"dwellingType": "House", "bedrooms": "3", "activeBonds": 90, "lq": 750, "med": 830, "uq": 920},
        ],
    },
    "albany": {
        "label": "Albany",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 40, "lq": 200, "med": 245, "uq": 290},
            {"dwellingType": "Flat", "bedrooms": "2", "activeBonds": 160, "lq": 430, "med": 490, "uq": 545},
            {"dwellingType": "House", "bedrooms": "4", "activeBonds": 140, "lq": 720, "med": 790, "uq": 870},
        ],
    },
    "manukau": {
        "label": "Manukau",
        "entries": [
            {"dwellingType": "Room", "bedrooms": "1", "activeBonds": 70, "lq": 180, "med": 220, "uq": 260},
            {"dwellingType": "Flat", "bedrooms": "2", "activeBonds": 190, "lq": 400, "med": 450, "uq": 500},
            {"dwellingType": "House", "bedrooms": "3", "activeBonds": 210, "lq": 540, "med": 600, "uq": 660},
        ],
    },
}


class RentModel:
    @staticmethod
    def get_all_areas():
        """Returns the list of areas available, for a dropdown/selector."""
        return [
            {"id": area_id, "label": area["label"]}
            for area_id, area in _MOCK_AREAS.items()
        ]

    @staticmethod
    def get_area_rent(area_id):
        """Returns the full rent breakdown for one area, or None if unknown."""
        area = _MOCK_AREAS.get(area_id)
        if area is None:
            return None
        return {
            "id": area_id,
            "label": area["label"],
            "period": DATA_AS_OF,
            "entries": area["entries"],
        }

    @staticmethod
    def get_all_areas_summary():
        """Returns every area with its cheapest entry, used to build a
        'cheapest for students' ranking across all areas at once."""
        summary = []
        for area_id, area in _MOCK_AREAS.items():
            cheapest = min(area["entries"], key=lambda e: e["med"])
            summary.append({
                "id": area_id,
                "label": area["label"],
                "cheapestType": cheapest["dwellingType"],
                "cheapestBedrooms": cheapest["bedrooms"],
                "cheapestMedian": cheapest["med"],
            })
        return summary
