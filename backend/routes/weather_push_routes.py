# backend/routes/weather_push_routes.py
# Web addresses for the scheduled (push) weather alert.
from flask import Blueprint, jsonify, request
from controllers.weather_push_controller import (
    get_public_key_logic,
    get_status_logic,
    subscribe_logic,
    update_time_logic,
    unsubscribe_logic,
    send_test_logic,
)

weather_push_bp = Blueprint('weather_push', __name__, url_prefix='/api/weather/push')


@weather_push_bp.route('/public-key', methods=['GET'])
def public_key():
    result, status_code = get_public_key_logic()
    return jsonify(result), status_code


@weather_push_bp.route('/status', methods=['GET'])
def status():
    result, status_code = get_status_logic(request.args.get('user_id', type=int), request.args.get('endpoint'))
    return jsonify(result), status_code


@weather_push_bp.route('/subscribe', methods=['POST'])
def subscribe():
    data = request.get_json() or {}
    result, status_code = subscribe_logic(
        data.get('user_id'), data.get('subscription'), data.get('notify_time'), data.get('timezone')
    )
    return jsonify(result), status_code


@weather_push_bp.route('/time', methods=['PUT'])
def update_time():
    data = request.get_json() or {}
    result, status_code = update_time_logic(
        data.get('user_id'), data.get('endpoint'), data.get('notify_time'), data.get('timezone')
    )
    return jsonify(result), status_code


@weather_push_bp.route('/unsubscribe', methods=['POST'])
def unsubscribe():
    data = request.get_json() or {}
    result, status_code = unsubscribe_logic(data.get('user_id'), data.get('endpoint'))
    return jsonify(result), status_code


@weather_push_bp.route('/test', methods=['POST'])
def send_test():
    data = request.get_json() or {}
    result, status_code = send_test_logic(data.get('user_id'), data.get('endpoint'))
    return jsonify(result), status_code
