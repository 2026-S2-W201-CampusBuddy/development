# This is the "Boss" file that starts everything
from flask import Flask
from flask_cors import CORS
from extensions import db

# Hi jun! This is Sedric. I'm testing my Git and GitHub skills. Second Try

# Import the Waiter (Routes) we made
from routes.api_routes import api_bp
from routes.post_routes import post_bp
from routes.comment_routes import comment_bp
from routes.auth_routes import auth_bp

# This is george.

# Initialize the Flask app
app = Flask(__name__)
# Let React (port 5173) talk to our Flask (port 5000)
CORS(app)

# Tell Flask where to store the database file
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///campusbuddy.db'

# Connect the db object to this Flask app
db.init_app(app)

# Connect our web addresses (Blueprint) to the app
app.register_blueprint(api_bp)
app.register_blueprint(post_bp)
app.register_blueprint(comment_bp)
app.register_blueprint(auth_bp)

# Start the server!
if __name__ == '__main__':
    # Run on port 5000 with auto-reload (debug=True)
    app.run(debug=True, port=5000)