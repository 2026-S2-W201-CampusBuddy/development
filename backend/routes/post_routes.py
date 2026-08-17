# This file is like a "Waiter" who handles web addresses for posts
from flask import Blueprint, jsonify, request
from controllers.post_controller import create_post_logic, get_posts_logic

# Group our post-related API addresses together
post_bp = Blueprint('post', __name__, url_prefix='/api')

# When a user sends a POST request to '/api/posts', run this code
@post_bp.route('/posts', methods=['POST'])
def create_post():
    # Get the JSON data sent from the frontend (the request body)
    data = request.get_json()

    # Check if body is missing or not a JSON format
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON",
        }), 400

    # Check if the title field exists
    if 'title' not in data:
        return jsonify({
            "status": "error",
            "message": "Title is missing"
        }), 400

    # Check if the content field exists
    if 'content' not in data:
        return jsonify({
            "status": "error",
            "message": "Content is missing"
        }), 400

    # Check if the author field exists
    if 'author' not in data:
        return jsonify({
            "status": "error",
            "message": "Author is missing"
        }), 400

    # Check if the title is empty
    if data['title'] == "":
        return jsonify({
            "status": "error",
            "message": "Title is missing"
        }), 400
    
    # Pull out each field from the data
    title = data['title']
    content = data['content']
    author = data['author']
    
    # Ask the Controller (Chef) to handle the logic
    result = create_post_logic(title, content, author)
    
    # Turn the result into JSON format so React can read it
    return jsonify(result), 201

# When a user visits '/api/posts' with a GET request, run this code
@post_bp.route('/posts', methods=['GET'])
def get_posts():
    # Ask the Controller (Chef) to get all the posts
    result = get_posts_logic()

    # Turn the result into JSON format so React can read it
    return jsonify(result), 200