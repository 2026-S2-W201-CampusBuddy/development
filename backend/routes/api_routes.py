# This file is like a "Waiter" who handles web addresses
from flask import Blueprint, jsonify
from controllers.feature_controller import get_features_logic, greet_user_logic

# Group our API addresses together
api_bp = Blueprint('api', __name__, url_prefix='/api')

# When a user visits '/api/hello', run this code
@api_bp.route('/hello', methods=['GET'])
def hello():
    # Ask the Controller (Chef) to do the work
    result = get_features_logic()
    # Turn the result into JSON format so React can read it
    return jsonify(result)

# When a user visits '/api/greet/hyojun' (or any name), run this code
@api_bp.route('/greet/<name>', methods=['GET'])
def greet(name):
    # 'name' comes directly from the URL and Flask captures it automatically.
    result = greet_user_logic(name)
    return jsonify(result)