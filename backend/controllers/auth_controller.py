from models.user_model import User, CURRENT_TERMS_VERSION
from services.email_service import send_verification_email
import random
from datetime import datetime, timedelta

def generate_code():
    return str(random.randint(100000, 999999))

def register_logic(username, email, password, agreed_to_terms=False, terms_version=None):
    # Students use @autuni.ac.nz; staff (lecturers, TAs) use @aut.ac.nz —
    # both need to be able to register, since admin accounts for Peer
    # Review oversight are meant for staff too, not just students.
    email_lower = email.lower()
    if not (email_lower.endswith('@autuni.ac.nz') or email_lower.endswith('@aut.ac.nz')):
        return {"status": "error", "message": "You must sign up with an AUT email (@autuni.ac.nz or @aut.ac.nz)"}, 400

    if not agreed_to_terms:
        return {"status": "error", "message": "You must accept the Terms and Conditions to create an account"}, 400

    # The version the user ticked must be the version currently in force —
    # otherwise the version we record wouldn't match the text they actually
    # saw (e.g. they left the page open while the terms were updated).
    if terms_version != CURRENT_TERMS_VERSION:
        return {"status": "error", "message": "The Terms and Conditions have been updated — please refresh the page and read them again"}, 400

    if User.find_by_username(username):
        return {"status": "error", "message": "Username already exists"}, 400

    if User.find_by_email(email):
        return {"status": "error", "message": "Email already in use"}, 400

    new_user = User.create_user(username, email, password, agreed_to_terms=True)

    code = generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    new_user.set_verification_code(code, expires_at)

    send_verification_email(email, code)

    return {
        "status": "success",
        "message": "Registered! Check your email for a verification code.",
        "data": {"email": new_user.email}
    }, 201


def verify_email_logic(email, code):
    user = User.find_by_email(email)

    if not user:
        return {"status": "error", "message": "No account found for this email"}, 404

    if user.is_verified:
        return {"status": "error", "message": "Email already verified"}, 400

    if user.verification_code != code:
        return {"status": "error", "message": "Incorrect code"}, 400

    if datetime.utcnow() > user.verification_code_expires:
        return {"status": "error", "message": "Code expired, please request a new one"}, 400

    user.mark_verified()

    return {
        "status": "success",
        "message": "Email verified! You can now log in.",
        "data": {"id": user.id, "username": user.username}
    }, 200


def login_logic(email, password):
    user = User.find_by_email(email)

    if not user or not user.check_password(password):
        return {"status": "error", "message": "Invalid email or password"}, 401

    if not user.is_verified:
        return {"status": "error", "message": "Please verify your email before logging in"}, 403

    return {
        "status": "success",
        "message": "Login successful",
        "data": {"id": user.id, "username": user.username, "role": user.role}
    }, 200
def resend_code_logic(email):
    user = User.find_by_email(email)

    if not user:
        return {"status": "error", "message": "No account found for this email"}, 404

    if user.is_verified:
        return {"status": "error", "message": "Email already verified"}, 400

    code = generate_code()
    expires_at = datetime.utcnow() + timedelta(minutes=15)
    user.set_verification_code(code, expires_at)

    send_verification_email(email, code)

    return {"status": "success", "message": "New code sent"}, 200


def terms_status_logic(username):
    user = User.find_by_username(username)
    if not user:
        return {"status": "error", "message": "User not found"}, 404
    return {
        "status": "success",
        "message": "Terms status retrieved",
        "data": {
            "needsAcceptance": not user.has_accepted_current_terms(),
            "currentVersion": CURRENT_TERMS_VERSION,
        }
    }, 200


def accept_terms_logic(username, terms_version):
    user = User.find_by_username(username)
    if not user:
        return {"status": "error", "message": "User not found"}, 404

    if terms_version != CURRENT_TERMS_VERSION:
        return {"status": "error", "message": "The Terms and Conditions have been updated — please refresh the page and read them again"}, 400

    user.accept_current_terms()
    return {"status": "success", "message": "Terms accepted"}, 200
