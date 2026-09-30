from flask import Blueprint, jsonify, request
from controllers.settings_controller import (
    change_username_logic,
    change_password_logic,
    delete_account_logic,
    update_notifications_logic,
)

settings_bp = Blueprint('settings', __name__, url_prefix='/api')

@settings_bp.route('/user/username', methods=['PUT'])
def change_username():
    data = request.get_json()
    if not data or 'username' not in data or 'current_password' not in data or 'new_username' not in data:
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    result, status_code = change_username_logic(data['username'], data['current_password'], data['new_username'])
    return jsonify(result), status_code


@settings_bp.route('/user/password', methods=['PUT'])
def change_password():
    data = request.get_json()
    if not data or 'username' not in data or 'current_password' not in data or 'new_password' not in data:
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    result, status_code = change_password_logic(data['username'], data['current_password'], data['new_password'])
    return jsonify(result), status_code


@settings_bp.route('/user/account', methods=['DELETE'])
def delete_account():
    data = request.get_json()
    if not data or 'username' not in data or 'current_password' not in data:
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    result, status_code = delete_account_logic(data['username'], data['current_password'])
    return jsonify(result), status_code


@settings_bp.route('/user/notifications', methods=['PUT'])
def update_notifications():
    data = request.get_json()
    if not data or 'username' not in data or 'enabled' not in data:
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    result, status_code = update_notifications_logic(data['username'], data['enabled'])
    return jsonify(result), status_code