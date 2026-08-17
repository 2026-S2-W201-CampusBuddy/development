# This file is like a "Waiter" who handles web addresses for posts
from flask import Blueprint, jsonify, request
from controllers.comment_controller import create_comment_logic

# Group our post-related API addresses together
comment_bp = Blueprint('comment', __name__, url_prefix='/api')

# When a user sends a POST request to '/api/comments', run this code
@comment_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    # Get the JSON data sent from the frontend (the request body)
    data = request.get_json()

    # Check if body is missing or not a JSON format
    if not data:
        return jsonify({
            "status": "error",
            "message": "Request body must be valid JSON",
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
    
    # Pull out each field from the data
    content = data['content']
    author = data['author']
    
    # Ask the Controller (Chef) to handle the logic
    result = create_comment_logic(post_id, content, author)
    
    # Turn the result into JSON format so React can read it
    return jsonify(result), 201