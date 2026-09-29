from flask import Blueprint, request, jsonify
from controllers.friend_controller import (
    search_users,
    send_friend_request_logic,
    get_pending_requests_logic,
    respond_friend_request_logic,
    get_friend_list_logic,
    remove_friend_logic
)

friend_bp = Blueprint('friend', __name__)

# Search users
@friend_bp.route('/api/users/search', methods=['GET'])
def search_users_route():
    query = request.args.get('q', '')
    current_user_id = request.args.get('user_id', type=int)
    results = search_users(query, current_user_id)
    return jsonify(results), 200

# Send friend request
@friend_bp.route('/api/friends/request', methods=['POST'])
def send_friend_request():
    data = request.get_json() or {}
    sender_id = data.get('sender_id')
    receiver_id = data.get('receiver_id')
    response_data, status_code = send_friend_request_logic(sender_id, receiver_id)
    return jsonify(response_data), status_code

# Get pending requests for user
@friend_bp.route('/api/friends/requests/pending', methods=['GET'])
def get_pending_requests():
    user_id = request.args.get('user_id', type=int)
    results = get_pending_requests_logic(user_id)
    return jsonify(results), 200

# Accept or Decline request
@friend_bp.route('/api/friends/request/<int:request_id>/respond', methods=['POST'])
def respond_friend_request(request_id):
    data = request.get_json() or {}
    action = data.get('action')  # 'accept' or 'decline'
    response_data, status_code = respond_friend_request_logic(request_id, action)
    return jsonify(response_data), status_code

# Get friend list
@friend_bp.route('/api/friends', methods=['GET'])
def get_friends():
    user_id = request.args.get('user_id', type=int)
    results = get_friend_list_logic(user_id)
    return jsonify(results), 200

# Remove a friend
@friend_bp.route('/api/friends/<int:friend_id>', methods=['DELETE'])
def remove_friend(friend_id):
    user_id = request.args.get('user_id', type=int)
    response_data, status_code = remove_friend_logic(user_id, friend_id)
    return jsonify(response_data), status_code