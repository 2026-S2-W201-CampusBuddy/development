from models.comment_model import Comment
from models.post_model import Post

# Helper to normalize author and user_id from incoming request
def _parse_author_info(author_input, user_id_input=None):
    if isinstance(author_input, dict):
        username = author_input.get('username') or 'Anonymous'
        user_id = author_input.get('id') or author_input.get('user_id') or user_id_input
        return username, user_id
    return str(author_input) if author_input else 'Anonymous', user_id_input

def create_comment_logic(post_id, content, author, parent_id=None, user_id=None):
    post = Post.query.get(post_id)
    if not post:
        return {"status": "error", "message": "Post not found"}, 404

    if parent_id:
        parent_comment = Comment.query.get(parent_id)
        if not parent_comment or parent_comment.post_id != post_id:
            return {"status": "error", "message": "Parent comment not found"}, 404

    author_str, uid = _parse_author_info(author, user_id)
    new_comment = Comment.add_comment(post_id, content, author_str, user_id=uid, parent_id=parent_id)
    return {
        "status": "success",
        "message": "Comment created successfully",
        "data": new_comment.to_dict()
    }, 201

def get_comments_logic(post_id):
    post = Post.query.get(post_id)
    if not post:
        return {"status": "error", "message": "Post not found"}, 404

    comments = Comment.get_comments_for_post(post_id)
    comments_list = [comment.to_dict() for comment in comments]
    return {
        "status": "success",
        "message": "Comments retrieved successfully",
        "data": comments_list
    }, 200

# Update comment with ID-based or username-based permission check
def update_comment_logic(post_id, comment_id, content, author, user_id=None):
    comment = Comment.query.filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        return {"status": "error", "message": "Comment not found"}, 404

    author_str, uid = _parse_author_info(author, user_id)
    has_permission = (comment.user_id and uid and comment.user_id == uid) or (comment.author == author_str)
    if not has_permission:
        return {"status": "error", "message": "You can only edit your own comments"}, 403

    comment.update_comment(content)
    return {
        "status": "success",
        "message": "Comment updated successfully",
        "data": comment.to_dict()
    }, 200

# Delete comment with ID-based or username-based permission check
def delete_comment_logic(post_id, comment_id, author, user_id=None):
    comment = Comment.query.filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        return {"status": "error", "message": "Comment not found"}, 404

    author_str, uid = _parse_author_info(author, user_id)
    has_permission = (comment.user_id and uid and comment.user_id == uid) or (comment.author == author_str)
    if not has_permission:
        return {"status": "error", "message": "You can only delete your own comments"}, 403

    Comment.query.filter_by(parent_id=comment_id).delete()
    comment.delete_comment()

    return {"status": "success", "message": "Comment deleted successfully"}, 200