from models.post_model import Post
from models.comment_model import Comment
from extensions import db

# Helper function to extract username if author is passed as dict/object
def _extract_author_name(author):
    if isinstance(author, dict):
        return author.get('username') or 'Anonymous'
    return str(author) if author else 'Anonymous'

def create_post_logic(title, content, author, category='general', event_date=None, event_location=None):
    # Safely convert author dict to username string
    author_str = _extract_author_name(author)
    new_post = Post.add_post(title, content, author_str, category, event_date, event_location)
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

# Update post only if current user is the author
def update_post_logic(post_id, title, content, author):
    post = Post.query.get(post_id)
    if not post:
        return {
            "status": "error",
            "message": "Post not found"
        }, 404

    author_str = _extract_author_name(author)
    # Permission check using username string
    if post.author != author_str:
        return {
            "status": "error",
            "message": "You can only edit your own posts"
        }, 403

    post.update_post(title, content)
    return {
        "status": "success",
        "message": "Post updated successfully",
        "data": post.to_dict()
    }, 200

# Delete post only if current user is the author
def delete_post_logic(post_id, author):
    post = Post.query.get(post_id)
    if not post:
        return {
            "status": "error",
            "message": "Post not found"
        }, 404

    author_str = _extract_author_name(author)
    # Permission check using username string
    if post.author != author_str:
        return {
            "status": "error",
            "message": "You can only delete your own posts"
        }, 403

    # Delete all associated comments first
    Comment.query.filter_by(post_id=post_id).delete()
    post.delete_post()

    return {
        "status": "success",
        "message": "Post deleted successfully"
    }, 200