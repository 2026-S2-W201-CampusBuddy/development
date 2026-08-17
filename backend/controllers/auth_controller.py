# This file is like a "Chef" who handles the logic for signup and login
from models.user_model import User

def register_logic(username, password):
    # Check if this username is already taken
    existing_user = User.find_by_username(username)
    if existing_user:
        return {
            "status": "error",
            "message": "Username already exists"
        }, 400

    # Create the new user (password gets hashed inside create_user)
    new_user = User.create_user(username, password)

    return {
        "status": "success",
        "message": "User registered successfully",
        "data": {"id": new_user.id, "username": new_user.username}
    }, 201


def login_logic(username, password):
    # Find the user by username
    user = User.find_by_username(username)

    # If user doesn't exist, or password doesn't match
    if not user or not user.check_password(password):
        return {
            "status": "error",
            "message": "Invalid username or password"
        }, 401

    return {
        "status": "success",
        "message": "Login successful",
        "data": {"id": user.id, "username": user.username}
    }, 200