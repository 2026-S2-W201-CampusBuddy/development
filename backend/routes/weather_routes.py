# This file is like a "Waiter" who handles the weather web address
from flask import Blueprint, jsonify
from controllers.weather_controller import get_auckland_weather_logic

weather_bp = Blueprint('weather', __name__, url_prefix='/api')

@weather_bp.route('/weather/auckland', methods=['GET'])
def get_auckland_weather():
    try:
        result = get_auckland_weather_logic()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Could not fetch weather data: {str(e)}"
        }), 500