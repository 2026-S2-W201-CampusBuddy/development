from extensions import db
from models.friend_model import FriendRequest, Friendship
from models.user_model import User

# 1. Search Users
def search_users(query_str, current_user_id=None):
    # Search users by username matching query
    query = User.query.filter(User.username.ilike(f'%{query_str}%'))
    
    # Exclude current user from search results
    if current_user_id is not None:
        query = query.filter(User.id != current_user_id)
        
    users = query.all()
    
    # If no logged in user context, return users with default 'none' status
    if not current_user_id:
        return [{'id': u.id, 'username': u.username, 'email': u.email, 'status': 'none'} for u in users]

    # Pre-fetch existing friendships for current user
    friendships = Friendship.query.filter_by(user_id=current_user_id).all()
    friend_ids = {f.friend_id for f in friendships}

    # Pre-fetch pending outgoing requests sent by current user
    outgoing_requests = FriendRequest.query.filter_by(
        sender_id=current_user_id, 
        status='pending'
    ).all()
    pending_sent_ids = {r.receiver_id for r in outgoing_requests}

    # Pre-fetch pending incoming requests received by current user
    incoming_requests = FriendRequest.query.filter_by(
        receiver_id=current_user_id, 
        status='pending'
    ).all()
    pending_received_ids = {r.sender_id for r in incoming_requests}

    results = []
    for u in users:
        # Determine relationship status
        if u.id in friend_ids:
            rel_status = 'friends'
        elif u.id in pending_sent_ids:
            rel_status = 'pending_sent'
        elif u.id in pending_received_ids:
            rel_status = 'pending_received'
        else:
            rel_status = 'none'

        results.append({
            'id': u.id,
            'username': u.username,
            'email': u.email,
            'status': rel_status
        })
        
    return results

# 2. Send Friend Request with Pending Check
def send_friend_request_logic(sender_id, receiver_id):
    # Validate sender and receiver presence
    if not sender_id or not receiver_id:
        return {'message': 'Sender ID and Receiver ID are required'}, 400

    if sender_id == receiver_id:
        return {'message': 'Cannot send a friend request to yourself'}, 400

    # Check if they are already friends
    existing_friendship = Friendship.query.filter_by(
        user_id=sender_id,
        friend_id=receiver_id
    ).first()
    if existing_friendship:
        return {'message': 'Already friends'}, 400

    # Check if a pending request already exists in either direction
    existing_request = FriendRequest.query.filter(
        ((FriendRequest.sender_id == sender_id) & (FriendRequest.receiver_id == receiver_id)) |
        ((FriendRequest.sender_id == receiver_id) & (FriendRequest.receiver_id == sender_id)),
        FriendRequest.status == 'pending'
    ).first()

    if existing_request:
        return {'message': 'Request already pending'}, 400

    # Create new request
    new_request = FriendRequest(sender_id=sender_id, receiver_id=receiver_id)
    db.session.add(new_request)
    db.session.commit()

    return {
        'message': 'Friend request sent successfully',
        'status': new_request.status,
        'sender_id': sender_id,
        'receiver_id': receiver_id
    }, 201

# 3. Get Pending Requests
def get_pending_requests_logic(user_id):
    if not user_id:
        return []

    requests = FriendRequest.query.filter_by(receiver_id=user_id, status='pending').all()
    result = []
    for req in requests:
        sender = User.query.get(req.sender_id)
        result.append({
            'request_id': req.id,
            'sender_id': req.sender_id,
            'sender_username': sender.username if sender else f"User {req.sender_id}"
        })
    return result

# 4. Respond to Friend Request (Accept / Decline)
def respond_friend_request_logic(request_id, action):
    req = FriendRequest.query.get(request_id)
    if not req:
        return {'message': 'Request not found'}, 404

    if action == 'accept':
        req.status = 'accepted'
        # Add bilateral friendship entries
        f1 = Friendship(user_id=req.sender_id, friend_id=req.receiver_id)
        f2 = Friendship(user_id=req.receiver_id, friend_id=req.sender_id)
        db.session.add_all([f1, f2])
        db.session.commit()
        return {'message': 'Friend request accepted'}, 200

    elif action == 'decline':
        req.status = 'rejected'
        db.session.delete(req)
        db.session.commit()
        return {'message': 'Friend request declined'}, 200

    return {'message': 'Invalid action'}, 400

# 5. Get Friend List
def get_friend_list_logic(user_id):
    if not user_id:
        return []

    friendships = Friendship.query.filter_by(user_id=user_id).all()
    friends = []
    for f in friendships:
        friend_user = User.query.get(f.friend_id)
        if friend_user:
            friends.append({'id': friend_user.id, 'username': friend_user.username})
    return friends

# 6. Remove Friend
def remove_friend_logic(user_id, friend_id):
    if not user_id or not friend_id:
        return {'message': 'Invalid parameters'}, 400

    # Remove entries for both users
    Friendship.query.filter(
        ((Friendship.user_id == user_id) & (Friendship.friend_id == friend_id)) |
        ((Friendship.user_id == friend_id) & (Friendship.friend_id == user_id))
    ).delete()
    db.session.commit()
    return {'message': 'Friend removed successfully'}, 200