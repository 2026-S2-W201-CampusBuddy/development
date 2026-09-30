from models.user_model import User

def change_username_logic(username, current_password, new_username):
    user = User.find_by_username(username)
    if not user or not user.check_password(current_password):
        return {"status": "error", "message": "Incorrect password"}, 401

    if User.find_by_username(new_username):
        return {"status": "error", "message": "Username already taken"}, 400

    user.update_username(new_username)
    return {"status": "success", "message": "Username updated", "data": {"username": new_username}}, 200


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