# This file is like a "Waiter" who handles the world clock web address
from flask import Blueprint, jsonify, request
from controllers.worldclock_controller import get_world_clock_logic

worldclock_bp = Blueprint('worldclock', __name__, url_prefix='/api')


@worldclock_bp.route('/worldclock', methods=['GET'])
def get_world_clock():
    zones_param = request.args.get('zones', '')
    zone_list = [z.strip() for z in zones_param.split(',') if z.strip()]

    try:
        result = get_world_clock_logic(zone_list)
        return jsonify(result), 200
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Could not fetch world clock data: {str(e)}"
        }), 500
