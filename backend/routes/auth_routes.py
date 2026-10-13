from flask import Blueprint, jsonify, request
from controllers.auth_controller import (
    register_logic, login_logic, verify_email_logic, resend_code_logic,
    terms_status_logic, accept_terms_logic,
)
auth_bp = Blueprint('auth', __name__, url_prefix='/api')

@auth_bp.route('/register', methods=['POST'])
def register():
    data = request.get_json()
    if not data or 'username' not in data or 'email' not in data or 'password' not in data:
        return jsonify({"status": "error", "message": "username, email and password are required"}), 400

    result, status_code = register_logic(
        data['username'], data['email'], data['password'],
        data.get('agreedToTerms', False), data.get('termsVersion')
    )
    return jsonify(result), status_code


@auth_bp.route('/terms-status', methods=['GET'])
def terms_status():
    username = request.args.get('username', '')
    if not username:
        return jsonify({"status": "error", "message": "username query param is required"}), 400
    result, status_code = terms_status_logic(username)
    return jsonify(result), status_code


@auth_bp.route('/accept-terms', methods=['POST'])
def accept_terms():
    data = request.get_json()
    if not data or 'username' not in data or 'termsVersion' not in data:
        return jsonify({"status": "error", "message": "username and termsVersion are required"}), 400
    result, status_code = accept_terms_logic(data['username'], data['termsVersion'])
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