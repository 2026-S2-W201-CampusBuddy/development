import os
import requests
from flask import Blueprint, jsonify, request
from models.user_model import User
from extensions import db

api_bp = Blueprint('api', __name__, url_prefix='/api')

# --- NEW: Google Places API Integration for Groceries ---
@api_bp.route('/groceries', methods=['GET'])
def get_groceries():
    # Get location from query parameters (default to Auckland CBD)
    location_query = request.args.get('location', 'Auckland CBD')
    
    # Get Google API key from backend environment variables
    api_key = os.getenv('GOOGLE_MAPS_API_KEY')
    
    if not api_key:
        # Fallback to mock data if API key is missing on backend
        return jsonify({
            "source": "mock",
            "stores": [
                { "id": 1, "name": f"Mock Countdown near {location_query}", "price_tier": "$$ (Moderate)", "distance_km": 0.8, "address": "123 Main St" },
                { "id": 2, "name": f"Mock New World near {location_query}", "price_tier": "$$$ (Expensive)", "distance_km": 1.4, "address": "456 Market Rd" }
            ]
        })

    # Call Google Places Text Search API for supermarkets/groceries
    url = f"https://maps.googleapis.com/maps/api/place/textsearch/json?query=supermarket+grocery+in+{location_query}+Auckland+NZ&key={api_key}"
    
    try:
        response = requests.get(url)
        data = response.json()
        
        stores = []
        if data.get('status') == 'OK':
            for place in data.get('results', []):  # Top 6 results
                stores.append({
                    "id": place.get('place_id'),
                    "name": place.get('name'),
                    "address": place.get('formatted_address'),
                    "price_tier": "$$ (Moderate)",
                    "rating": place.get('rating', 'N/A'), # 평점 추가 (없으면 N/A)
                    "geometry": place.get('geometry', {}).get('location', {})
                })
        
        return jsonify({
            "source": "google_places",
            "location": location_query,
            "stores": stores
        })
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

# --- NEW: User Preferred Location APIs ---
@api_bp.route('/user/location', methods=['POST'])
def update_user_location():
    data = request.json
    username = data.get('username')
    new_location = data.get('location')
    
    user = User.find_by_username(username)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    user.preferred_location = new_location
    db.session.commit()
    
    return jsonify({"success": True, "preferred_location": user.preferred_location})

@api_bp.route('/user/location/<username>', methods=['GET'])
def get_user_location(username):
    user = User.find_by_username(username)
    if not user:
        return jsonify({"error": "User not found"}), 404
        
    return jsonify({"preferred_location": user.preferred_location})