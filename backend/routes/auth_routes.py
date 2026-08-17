# This file is like a "Waiter" who handles web addresses for signup/login
from flask import Blueprint, jsonify, request
from controllers.auth_controller import register_logic, login_logic

auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({
            "status": "error",
            "message": "username and password are required"
        }), 400

    result, status_code = register_logic(data['username'], data['password'])
    return jsonify(result), status_code


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()

    if not data or 'username' not in data or 'password' not in data:
        return jsonify({
            "status": "error",
            "message": "username and password are required"
        }), 400

    result, status_code = login_logic(data['username'], data['password'])
    return jsonify(result), status_code