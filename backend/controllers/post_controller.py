from models.post_model import Post
from models.comment_model import Comment
from extensions import db

def create_post_logic(title, content, author, category='general'):
    new_post = Post.add_post(title, content, author, category)
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

    # Permission check
    if post.author != author:
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

    # Permission check
    if post.author != author:
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