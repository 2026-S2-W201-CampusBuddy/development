# backend/routes/calendar_routes.py
# Web addresses for the Calendar bubble and the Alerts bubble.
from flask import Blueprint, jsonify, request
from controllers.calendar_controller import (
    list_events_logic, create_event_logic, update_event_logic, delete_event_logic,
    summary_logic, upcoming_logic, inbox_logic, mark_read_logic,
    device_status_logic, device_subscribe_logic, device_unsubscribe_logic, device_test_logic,
)

calendar_bp = Blueprint('calendar', __name__, url_prefix='/api')


def _respond(result_and_status):
    result, status_code = result_and_status
    return jsonify(result), status_code


# ---------------- Calendar events ----------------
@calendar_bp.route('/calendar/events', methods=['GET'])
def list_events():
    return _respond(list_events_logic(
        request.args.get('user_id', type=int), request.args.get('from'), request.args.get('to')))


@calendar_bp.route('/calendar/events', methods=['POST'])
def create_event():
    data = request.get_json() or {}
    return _respond(create_event_logic(data.get('user_id'), data))


@calendar_bp.route('/calendar/events/<int:event_id>', methods=['PUT'])
def update_event(event_id):
    data = request.get_json() or {}
    return _respond(update_event_logic(data.get('user_id'), event_id, data))


@calendar_bp.route('/calendar/events/<int:event_id>', methods=['DELETE'])
def delete_event(event_id):
    data = request.get_json(silent=True) or {}
    user_id = request.args.get('user_id', type=int) or data.get('user_id')
    return _respond(delete_event_logic(user_id, event_id))


# ---------------- Alerts ----------------
@calendar_bp.route('/alerts/summary', methods=['GET'])
def alerts_summary():
    return _respond(summary_logic(request.args.get('user_id', type=int), request.args.get('date')))


@calendar_bp.route('/alerts/upcoming', methods=['GET'])
def alerts_upcoming():
    return _respond(upcoming_logic(request.args.get('user_id', type=int), request.args.get('limit', default=30, type=int)))


@calendar_bp.route('/alerts/inbox', methods=['GET'])
def alerts_inbox():
    return _respond(inbox_logic(request.args.get('user_id', type=int), request.args.get('limit', default=50, type=int)))


@calendar_bp.route('/alerts/read', methods=['POST'])
def alerts_read():
    data = request.get_json() or {}
    return _respond(mark_read_logic(data.get('user_id'), data.get('ids'), bool(data.get('all'))))


# ---------------- Devices that receive the push ----------------
@calendar_bp.route('/alerts/devices/status', methods=['GET'])
def device_status():
    return _respond(device_status_logic(request.args.get('user_id', type=int), request.args.get('endpoint')))


@calendar_bp.route('/alerts/devices/subscribe', methods=['POST'])
def device_subscribe():
    data = request.get_json() or {}
    return _respond(device_subscribe_logic(data.get('user_id'), data.get('subscription')))


@calendar_bp.route('/alerts/devices/unsubscribe', methods=['POST'])
def device_unsubscribe():
    data = request.get_json() or {}
    return _respond(device_unsubscribe_logic(data.get('user_id'), data.get('endpoint')))


@calendar_bp.route('/alerts/test', methods=['POST'])
def alerts_test():
    data = request.get_json() or {}
    return _respond(device_test_logic(data.get('user_id'), data.get('endpoint')))
