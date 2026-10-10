# tests/test_friends.py
import pytest
from app import create_app, db

@pytest.fixture
def client():
    app = create_app('testing')
    with app.test_client() as client:
        with app.app_context():
            db.create_all()
            yield client
            db.drop_all()

def test_send_friend_request_success(client):
    # 1. Send friend request API call (User 1 -> User 2)
    response = client.post('/api/friends/request', json={
        'sender_id': 1,
        'receiver_id': 2
    })
    
    # 2. Expected assertion: Check 201 Created status and 'pending' state
    assert response.status_code == 201
    assert response.json['status'] == 'pending'


# ---------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------
from models.user_model import User
from models.friend_model import FriendRequest, Friendship


def make_users():
    """Create 'me' and 'George' and return their ids."""
    me = User.create_user('me', 'me@test.com', 'pw12345')
    george = User.create_user('George', 'george@test.com', 'pw12345')
    return me.id, george.id


def make_friends(a, b):
    db.session.add_all([Friendship(user_id=a, friend_id=b),
                        Friendship(user_id=b, friend_id=a)])
    db.session.commit()


def make_pending_request(sender, receiver):
    req = FriendRequest(sender_id=sender, receiver_id=receiver)
    db.session.add(req)
    db.session.commit()
    return req


# ===============================================================
# User Story 1: view my friend list and remove friends
# ===============================================================
def test_remove_1_cancel_keeps_friend(client):
    # Given: I clicked "Remove" but cancelled the confirmation modal
    #        (Cancel => the DELETE API is never called)
    me, george = make_users()
    make_friends(me, george)

    # Then: George remains on my friend list
    friends = client.get(f'/api/friends?user_id={me}').json
    assert any(f['id'] == george for f in friends)


def test_remove_2_removes_friend(client):
    # Given: me and George are friends
    me, george = make_users()
    make_friends(me, george)

    # When: I click "Remove" next to George
    response = client.delete(f'/api/friends/{george}?user_id={me}')

    # Then: George is removed from my friend list
    assert response.status_code == 200
    friends = client.get(f'/api/friends?user_id={me}').json
    assert all(f['id'] != george for f in friends)


def test_remove_3_removes_both_sides(client):
    # Given: me and George are friends
    me, george = make_users()
    make_friends(me, george)

    # When: I remove George
    client.delete(f'/api/friends/{george}?user_id={me}')

    # Then: I am also gone from George's friend list
    george_friends = client.get(f'/api/friends?user_id={george}').json
    assert all(f['id'] != me for f in george_friends)


# ===============================================================
# User Story 2: accept or decline incoming friend requests
# ===============================================================
def test_respond_1_accept(client):
    # Given: a pending request from George to me
    me, george = make_users()
    req = make_pending_request(george, me)

    # When: I click "Accept"
    response = client.post(f'/api/friends/request/{req.id}/respond',
                           json={'action': 'accept'})

    # Then: George is added to my friend list
    assert response.status_code == 200
    friends = client.get(f'/api/friends?user_id={me}').json
    assert any(f['id'] == george for f in friends)


def test_respond_2_decline(client):
    # Given: a pending request from George to me
    me, george = make_users()
    req = make_pending_request(george, me)

    # When: I click "Decline"
    response = client.post(f'/api/friends/request/{req.id}/respond',
                           json={'action': 'decline'})

    # Then: the request is removed and George is not my friend
    assert response.status_code == 200
    pending = client.get(f'/api/friends/requests/pending?user_id={me}').json
    assert pending == []
    friends = client.get(f'/api/friends?user_id={me}').json
    assert friends == []


def test_respond_3_unknown_request_returns_404(client):
    # When: I respond to a request that does not exist
    response = client.post('/api/friends/request/999/respond',
                           json={'action': 'accept'})

    # Then: the system answers 404 Not Found
    assert response.status_code == 404


# ===============================================================
# User Story 3: search for users and send a friend request
# ===============================================================

def test_send_2_search_user(client):
    me, george = make_users()

    # When: I search for "George"
    results = client.get(f'/api/users/search?q=George&user_id={me}').json

    # Then: George is in the results and I am not
    assert any(u['id'] == george for u in results)
    assert all(u['id'] != me for u in results)


def test_send_3_duplicate_request_shows_pending(client):
    # Given: I already sent a request to George
    me, george = make_users()
    client.post('/api/friends/request',
                json={'sender_id': me, 'receiver_id': george})

    # When: I try to send another one
    response = client.post('/api/friends/request',
                           json={'sender_id': me, 'receiver_id': george})

    # Then: "Request already pending"
    assert response.status_code == 400
    assert response.json['message'] == 'Request already pending'
