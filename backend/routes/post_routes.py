from flask import Blueprint, jsonify, request
from controllers.post_controller import (
    create_post_logic,
    get_posts_logic,
    get_single_post_logic,
    update_post_logic,
    delete_post_logic
)

post_bp = Blueprint('post', __name__, url_prefix='/api')

@post_bp.route('/posts', methods=['POST'])
def create_post():
    data = request.get_json()
    if not data or 'title' not in data or 'content' not in data or 'author' not in data:
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    title = data['title']
    content = data['content']
    author = data['author']
    category = data.get('category', 'general')

    result = create_post_logic(title, content, author, category)
    return jsonify(result), 201

@post_bp.route('/posts', methods=['GET'])
def get_posts():
    category = request.args.get('category')
    result = get_posts_logic(category)
    return jsonify(result), 200

@post_bp.route('/posts/<int:post_id>', methods=['GET'])
def get_single_post(post_id):
    result, status_code = get_single_post_logic(post_id)
    return jsonify(result), status_code

# Update post route (PUT /api/posts/<post_id>)
@post_bp.route('/posts/<int:post_id>', methods=['PUT'])
def update_post(post_id):
    data = request.get_json()
    if not data or 'title' not in data or 'content' not in data or 'author' not in data:
        return jsonify({"status": "error", "message": "Missing required fields"}), 400

    result, status_code = update_post_logic(post_id, data['title'], data['content'], data['author'])
    return jsonify(result), status_code

# Delete post route (DELETE /api/posts/<post_id>)
@post_bp.route('/posts/<int:post_id>', methods=['DELETE'])
def delete_post(post_id):
    data = request.get_json()
    if not data or 'author' not in data:
        return jsonify({"status": "error", "message": "Author is required"}), 400

    result, status_code = delete_post_logic(post_id, data['author'])
    return jsonify(result), status_code