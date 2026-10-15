# This is the "Boss" file that starts everything
from flask import Flask
from flask_cors import CORS
from extensions import db
from routes.weather_routes import weather_bp
from routes.rent_routes import rent_bp
from routes.worldclock_routes import worldclock_bp
from routes.internships_routes import internships_bp
import os
from dotenv import load_dotenv
from routes.settings_routes import settings_bp
from routes.peer_review_routes import peer_review_bp
from routes.admin_routes import admin_bp
from routes.weather_push_routes import weather_push_bp
from services.weather_push_service import start_scheduler as start_weather_scheduler
from routes.calendar_routes import calendar_bp
from services.calendar_service import start_reminder_scheduler

load_dotenv()  # This line loads variables from .env file into os.environ

# Import the Waiter (Routes) we made
from routes.api_routes import api_bp
from routes.post_routes import post_bp
from routes.comment_routes import comment_bp
from routes.auth_routes import auth_bp
from routes.friend_routes import friend_bp

# Initialize the Flask app
app = Flask(__name__)
# Let React (port 5173) talk to our Flask (port 5000)
CORS(app)

# Tell Flask where to store the database file
# DATABASE_URL lets tests point at an in-memory database (see tests/conftest.py)
# so running pytest can never touch or wipe the real local dev database.
app.config['SQLALCHEMY_DATABASE_URI'] = os.getenv('DATABASE_URL', 'sqlite:///campusbuddy.db')

# Connect the db object to this Flask app
db.init_app(app)

# Connect our web addresses (Blueprint) to the app
app.register_blueprint(api_bp)
app.register_blueprint(post_bp)
app.register_blueprint(comment_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(weather_bp)
app.register_blueprint(rent_bp)
app.register_blueprint(worldclock_bp)
app.register_blueprint(friend_bp)
app.register_blueprint(settings_bp)
app.register_blueprint(internships_bp)
app.register_blueprint(peer_review_bp)
app.register_blueprint(admin_bp)
app.register_blueprint(weather_push_bp)
app.register_blueprint(calendar_bp)

# Create the database file/tabcles if they don't already exist
with app.app_context():
    db.create_all()
    # create_all() never adds columns to an existing table — this does, so a
    # database created before newer columns existed doesn't crash on login.
    from db_upgrade import add_missing_user_columns
    add_missing_user_columns(db)

# Production servers (gunicorn etc.) never run the __main__ block below.
# Set RUN_WEATHER_SCHEDULER=1 on exactly ONE worker/process to enable alerts there.
if os.getenv('RUN_WEATHER_SCHEDULER') == '1':
    start_weather_scheduler(app)
    start_reminder_scheduler(app)   # calendar event + alert notifications

# Factory function to support pytest execution
def create_app(config_name='testing'):
    if config_name == 'testing':
        app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
        app.config['TESTING'] = True
    return app

# Start the server
if __name__ == '__main__':
    # Scheduled weather alerts: a background thread checks every minute whether
    # anyone's chosen alert time has arrived. With debug=True Flask starts the
    # app twice (a watcher + the real one), so only the real one gets the thread.
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        start_weather_scheduler(app)
        start_reminder_scheduler(app)   # calendar event + alert notifications

    # Run on port 5000 with auto-reload (debug=True)
    app.run(debug=True, port=5000)
