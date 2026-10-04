# backend/models/user_model.py
from datetime import datetime
from werkzeug.security import generate_password_hash, check_password_hash
from extensions import db

class User(db.Model):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    email = db.Column(db.String(255), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    preferred_location = db.Column(db.String(100), default='Auckland CBD')

    is_verified = db.Column(db.Boolean, default=False)
    verification_code = db.Column(db.String(6))
    verification_code_expires = db.Column(db.DateTime)
    # Required acceptance of Terms & Conditions before an account can be
    # created — added because features like Peer Review make ratings
    # visible to other group members, so users need to knowingly agree
    # to that up front.
    agreed_to_terms = db.Column(db.Boolean, default=False)

    @staticmethod
    def create_user(username, email, password, agreed_to_terms=False):
        hashed_password = generate_password_hash(password)
        new_user = User(
            username=username,
            email=email,
            password_hash=hashed_password,
            preferred_location='Auckland CBD',
            is_verified=False,
            agreed_to_terms=agreed_to_terms
        )
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def find_by_username(username):
        return User.query.filter_by(username=username).first()

    @staticmethod
    def find_by_email(email):
        return User.query.filter_by(email=email).first()

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def set_verification_code(self, code, expires_at):
        self.verification_code = code
        self.verification_code_expires = expires_at
        db.session.commit()

    def mark_verified(self):
        self.is_verified = True
        self.verification_code = None
        self.verification_code_expires = None
        db.session.commit()

    notifications_enabled = db.Column(db.Boolean, default=True)

    def update_username(self, new_username):
        self.username = new_username
        db.session.commit()

    def update_password(self, new_password):
        self.password_hash = generate_password_hash(new_password)
        db.session.commit()

    def update_notifications(self, enabled):
        self.notifications_enabled = enabled
        db.session.commit()

    def delete_account(self):
        db.session.delete(self)
        db.session.commit()