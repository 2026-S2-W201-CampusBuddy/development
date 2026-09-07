from flask import Blueprint, jsonify, request
from controllers.auth_controller import register_logic, login_logic, verify_email_logic
from controllers.auth_controller import register_logic, login_logic, verify_email_logic, resend_code_logic
auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'email' not in data or 'password' not in data:
        return jsonify({"status": "error", "message": "username, email and password are required"}), 400

    result, status_code = register_logic(data['username'], data['email'], data['password'])
    return jsonify(result), status_code


@auth_bp.route('/verify-email', methods=['POST'])
def verify_email():
    data = request.get_json()
    if not data or 'email' not in data or 'code' not in data:
        return jsonify({"status": "error", "message": "email and code are required"}), 400

    result, status_code = verify_email_logic(data['email'], data['code'])
    return jsonify(result), status_code


@auth_bp.route('/login', methods=['POST'])
def login():
    data = request.get_json()
    if not data or 'email' not in data or 'password' not in data:
        return jsonify({"status": "error", "message": "email and password are required"}), 400

    result, status_code = login_logic(data['email'], data['password'])
    return jsonify(result), status_code

@auth_bp.route('/resend-code', methods=['POST'])
def resend_code():
    data = request.get_json()
    if not data or 'email' not in data:
        return jsonify({"status": "error", "message": "email is required"}), 400

    result, status_code = resend_code_logic(data['email'])
    return jsonify(result), status_code