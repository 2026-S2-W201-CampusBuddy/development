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