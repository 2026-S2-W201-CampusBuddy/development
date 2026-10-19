# backend/routes/peer_review_safety_routes.py
# Web addresses for Peer Review's safeguards (options, My Score, opt-in, disputes/reports).
from flask import Blueprint, jsonify, request
from controllers.peer_review_safety_controller import (
    get_options_logic, get_my_score_logic, set_score_visibility_logic, create_report_logic,
)

peer_review_safety_bp = Blueprint('peer_review_safety', __name__, url_prefix='/api/peer-review')


@peer_review_safety_bp.route('/options', methods=['GET'])
def options():
    result, status_code = get_options_logic()
    return jsonify(result), status_code


@peer_review_safety_bp.route('/my-score', methods=['GET'])
def my_score():
    username = request.args.get('username', '')
    if not username:
        return jsonify({"status": "error", "message": "username query param is required"}), 400
    result, status_code = get_my_score_logic(username)
    return jsonify(result), status_code


@peer_review_safety_bp.route('/score-visibility', methods=['POST'])
def score_visibility():
    data = request.get_json(silent=True) or {}
    if 'username' not in data or 'show' not in data:
        return jsonify({"status": "error", "message": "username and show are required"}), 400
    result, status_code = set_score_visibility_logic(data['username'], data['show'])
    return jsonify(result), status_code


@peer_review_safety_bp.route('/reports', methods=['POST'])
def create_report():
    data = request.get_json(silent=True) or {}
    if 'username' not in data or 'kind' not in data or 'reason' not in data:
        return jsonify({"status": "error", "message": "username, kind and reason are required"}), 400
    result, status_code = create_report_logic(
        data['username'], data['kind'], data.get('subjectUsername'), data['reason'], data.get('details'))
    return jsonify(result), status_code
