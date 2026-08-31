from flask import Blueprint, jsonify, request
from controllers.comment_controller import (
    create_comment_logic,
    get_comments_logic,
    update_comment_logic,
    delete_comment_logic
)

comment_bp = Blueprint('comment', __name__, url_prefix='/api')

@comment_bp.route('/posts/<int:post_id>/comments', methods=['POST'])
def create_comment(post_id):
    data = request.get_json()
    if not data or 'content' not in data or 'author' not in data:
        return jsonify({"status": "error", "message": "Content and author are required"}), 400
    
    content = data['content']
    author = data['author']
    parent_id = data.get('parent_id', None)
    
    result, status_code = create_comment_logic(post_id, content, author, parent_id)
    return jsonify(result), status_code

@comment_bp.route('/posts/<int:post_id>/comments', methods=['GET'])
def get_comments(post_id):
    result, status_code = get_comments_logic(post_id)
    return jsonify(result), status_code

# Update comment route (PUT /api/posts/<post_id>/comments/<comment_id>)
@comment_bp.route('/posts/<int:post_id>/comments/<int:comment_id>', methods=['PUT'])
def update_comment(post_id, comment_id):
    data = request.get_json()
    if not data or 'content' not in data or 'author' not in data:
        return jsonify({"status": "error", "message": "Content and author are required"}), 400

    result, status_code = update_comment_logic(post_id, comment_id, data['content'], data['author'])
    return jsonify(result), status_code

# Delete comment route (DELETE /api/posts/<post_id>/comments/<comment_id>)
@comment_bp.route('/posts/<int:post_id>/comments/<int:comment_id>', methods=['DELETE'])
def delete_comment(post_id, comment_id):
    data = request.get_json()
    if not data or 'author' not in data:
        return jsonify({"status": "error", "message": "Author is required"}), 400

    result, status_code = delete_comment_logic(post_id, comment_id, data['author'])
    return jsonify(result), status_code