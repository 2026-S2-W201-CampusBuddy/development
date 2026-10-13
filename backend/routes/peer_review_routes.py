# This file is like a "Waiter" who handles the peer review web addresses
from flask import Blueprint, jsonify, request
from controllers.peer_review_controller import (
    create_group_logic,
    invite_to_group_logic,
    respond_to_invite_logic,
    submit_rating_logic,
    get_my_groups_logic,
    get_my_invites_logic,
    get_my_ratings_given_logic,
    get_public_score_logic,
)

peer_review_bp = Blueprint('peer_review', __name__, url_prefix='/api/peer-review')


@peer_review_bp.route('/groups', methods=['POST'])
def create_group():
    data = request.get_json()
    if not data or 'username' not in data or 'groupName' not in data:
        return jsonify({"status": "error", "message": "username and groupName are required"}), 400
    result, status_code = create_group_logic(data['username'], data['groupName'])
    return jsonify(result), status_code


@peer_review_bp.route('/groups/<int:group_id>/invite', methods=['POST'])
def invite_to_group(group_id):
    data = request.get_json()
    if not data or 'username' not in data or 'inviteeUsername' not in data:
        return jsonify({"status": "error", "message": "username and inviteeUsername are required"}), 400
    result, status_code = invite_to_group_logic(data['username'], group_id, data['inviteeUsername'])
    return jsonify(result), status_code


@peer_review_bp.route('/invites/<int:membership_id>/respond', methods=['POST'])
def respond_to_invite(membership_id):
    data = request.get_json()
    if not data or 'username' not in data or 'action' not in data:
        return jsonify({"status": "error", "message": "username and action are required"}), 400
    result, status_code = respond_to_invite_logic(membership_id, data['username'], data['action'])
    return jsonify(result), status_code


@peer_review_bp.route('/ratings', methods=['POST'])
def submit_rating():
    data = request.get_json()
    required = ['username', 'groupId', 'ratedUsername', 'scores']
    if not data or any(f not in data for f in required):
        return jsonify({"status": "error", "message": "username, groupId, ratedUsername and scores are required"}), 400
    result, status_code = submit_rating_logic(data['username'], data['groupId'], data['ratedUsername'], data['scores'])
    return jsonify(result), status_code


@peer_review_bp.route('/my-groups', methods=['GET'])
def my_groups():
    username = request.args.get('username', '')
    if not username:
        return jsonify({"status": "error", "message": "username query param is required"}), 400
    result, status_code = get_my_groups_logic(username)
    return jsonify(result), status_code


@peer_review_bp.route('/my-invites', methods=['GET'])
def my_invites():
    username = request.args.get('username', '')
    if not username:
        return jsonify({"status": "error", "message": "username query param is required"}), 400
    result, status_code = get_my_invites_logic(username)
    return jsonify(result), status_code


@peer_review_bp.route('/my-ratings-given', methods=['GET'])
def my_ratings_given():
    username = request.args.get('username', '')
    if not username:
        return jsonify({"status": "error", "message": "username query param is required"}), 400
    result, status_code = get_my_ratings_given_logic(username)
    return jsonify(result), status_code


@peer_review_bp.route('/score/<target_username>', methods=['GET'])
def public_score(target_username):
    result, status_code = get_public_score_logic(target_username)
    return jsonify(result), status_code
