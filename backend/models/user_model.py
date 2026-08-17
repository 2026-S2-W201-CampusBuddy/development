# This file is like a "Warehouse" that stores user data
from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)

    @staticmethod
    def create_user(username, password):
        # Turn the plain password into a scrambled, unreadable hash
        hashed_password = generate_password_hash(password)

        new_user = User(username=username, password_hash=hashed_password)
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def find_by_username(username):
        # Look up a user by their username (returns None if not found)
        return User.query.filter_by(username=username).first()

    def check_password(self, password):
        # Compare a plain password against the stored hash
        return check_password_hash(self.password_hash, password)