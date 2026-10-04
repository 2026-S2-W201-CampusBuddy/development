# In backend/controllers/settings_controller.py
from models.user_model import User
from models.post_model import Post
from models.comment_model import Comment
from extensions import db

def change_username_logic(username, current_password, new_username):
    # Support both dict and string input safely
    uname = username.get('username') if isinstance(username, dict) else username
    user = User.find_by_username(uname)
    if not user or not user.check_password(current_password):
        return {"status": "error", "message": "Incorrect password"}, 401

    if User.find_by_username(new_username):
        return {"status": "error", "message": "Username already taken"}, 400

    old_username = user.username
    user.update_username(new_username)

    # --- ADD THESE 3 LINES: Cascade updated username to existing posts and comments ---
    Post.query.filter_by(author=old_username).update({'author': new_username})
    Comment.query.filter_by(author=old_username).update({'author': new_username})
    db.session.commit()
    # ---------------------------------------------------------------------------------

    return {
        "status": "success",
        "message": "Username updated",
        "data": {"id": user.id, "username": new_username}
    }, 200

def change_password_logic(username, current_password, new_password):
    user = User.find_by_username(username)
    if not user or not user.check_password(current_password):
        return {"status": "error", "message": "Incorrect current password"}, 401

    user.update_password(new_password)
    return {"status": "success", "message": "Password updated"}, 200


def delete_account_logic(username, current_password):
    user = User.find_by_username(username)
    if not user or not user.check_password(current_password):
        return {"status": "error", "message": "Incorrect password"}, 401

    user.delete_account()
    return {"status": "success", "message": "Account deleted"}, 200


def update_notifications_logic(username, enabled):
    user = User.find_by_username(username)
    if not user:
        return {"status": "error", "message": "User not found"}, 404

    user.update_notifications(enabled)
    return {"status": "success", "message": "Notification preference updated", "data": {"notifications_enabled": enabled}}, 200