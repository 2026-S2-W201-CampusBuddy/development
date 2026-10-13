# This file is like a "Waiter" who handles the admin web addresses
from flask import Blueprint, jsonify, request
from controllers.admin_controller import get_all_ratings_logic, get_all_groups_logic

admin_bp = Blueprint('admin', __name__, url_prefix='/api/admin')


@admin_bp.route('/peer-review/ratings', methods=['GET'])
def all_ratings():
    username = request.args.get('username', '')
    if not username:
        return jsonify({"status": "error", "message": "username query param is required"}), 400
    result, status_code = get_all_ratings_logic(username)
    return jsonify(result), status_code


@admin_bp.route('/peer-review/groups', methods=['GET'])
def all_groups():
    username = request.args.get('username', '')
    if not username:
        return jsonify({"status": "error", "message": "username query param is required"}), 400
    result, status_code = get_all_groups_logic(username)
    return jsonify(result), status_code
