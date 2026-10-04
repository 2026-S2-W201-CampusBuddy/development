from models.post_model import Post
from models.comment_model import Comment
from extensions import db

# Helper to normalize author and user_id from incoming request
def _parse_author_info(author_input, user_id_input=None):
    if isinstance(author_input, dict):
        username = author_input.get('username') or 'Anonymous'
        user_id = author_input.get('id') or author_input.get('user_id') or user_id_input
        return username, user_id
    return str(author_input) if author_input else 'Anonymous', user_id_input

def create_post_logic(title, content, author, category='general', event_date=None, event_location=None, user_id=None):
    author_str, uid = _parse_author_info(author, user_id)
    new_post = Post.add_post(title, content, author_str, user_id=uid, category=category, event_date=event_date, event_location=event_location)
    return {
        "status": "success",
        "message": "Post created successfully",
        "data": new_post.to_dict()
    }

def get_posts_logic(category=None):
    all_posts = Post.get_all_posts(category)
    posts_list = [post.to_dict() for post in all_posts]
    return {
        "status": "success",
        "message": "Posts retrieved successfully",
        "data": posts_list
    }

def get_single_post_logic(post_id):
    post = Post.query.get(post_id)
    if not post:
        return {
            "status": "error",
            "message": "Post not found"
        }, 404

    return {
        "status": "success",
        "message": "Post retrieved successfully",
        "data": post.to_dict()
    }, 200

# Update post with ID-based or username-based permission check
def update_post_logic(post_id, title, content, author, user_id=None):
    post = Post.query.get(post_id)
    if not post:
        return {"status": "error", "message": "Post not found"}, 404

    author_str, uid = _parse_author_info(author, user_id)
    # Check by user_id if available, fallback to username
    has_permission = (post.user_id and uid and post.user_id == uid) or (post.author == author_str)
    if not has_permission:
        return {"status": "error", "message": "You can only edit your own posts"}, 403

    post.update_post(title, content)
    return {
        "status": "success",
        "message": "Post updated successfully",
        "data": post.to_dict()
    }, 200

# Delete post with ID-based or username-based permission check
def delete_post_logic(post_id, author, user_id=None):
    post = Post.query.get(post_id)
    if not post:
        return {"status": "error", "message": "Post not found"}, 404

    author_str, uid = _parse_author_info(author, user_id)
    # Check by user_id if available, fallback to username
    has_permission = (post.user_id and uid and post.user_id == uid) or (post.author == author_str)
    if not has_permission:
        return {"status": "error", "message": "You can only delete your own posts"}, 403

    Comment.query.filter_by(post_id=post_id).delete()
    post.delete_post()

    return {"status": "success", "message": "Post deleted successfully"}, 200