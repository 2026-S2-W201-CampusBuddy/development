from extensions import db
from werkzeug.security import generate_password_hash, check_password_hash

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(100), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    # Added preferred location for grocery search (default is Auckland CBD)
    preferred_location = db.Column(db.String(100), default='Auckland CBD')

    @staticmethod
    def create_user(username, password):
        hashed_password = generate_password_hash(password)
        new_user = User(username=username, password_hash=hashed_password, preferred_location='Auckland CBD')
        db.session.add(new_user)
        db.session.commit()
        return new_user

    @staticmethod
    def find_by_username(username):
        return User.query.filter_by(username=username).first()

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)