# This file is like a "Waiter" who handles the rent web addresses
from flask import Blueprint, jsonify
from controllers.rent_controller import (
    get_all_areas_logic,
    get_area_rent_logic,
    get_cheapest_areas_logic,
)

rent_bp = Blueprint('rent', __name__, url_prefix='/api')


@rent_bp.route('/rent/areas', methods=['GET'])
def get_areas():
    try:
        result = get_all_areas_logic()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Could not fetch rent areas: {str(e)}"
        }), 500


@rent_bp.route('/rent/areas/<area_id>', methods=['GET'])
def get_area(area_id):
    try:
        result, status_code = get_area_rent_logic(area_id)
        return jsonify(result), status_code
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Could not fetch rent data: {str(e)}"
        }), 500


@rent_bp.route('/rent/cheapest', methods=['GET'])
def get_cheapest():
    try:
        result = get_cheapest_areas_logic()
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Could not fetch cheapest areas: {str(e)}"
        }), 500
