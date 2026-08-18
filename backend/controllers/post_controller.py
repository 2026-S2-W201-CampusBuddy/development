# This file is like a "Chef" who handles the logic for posts
from models.post_model import Post

def create_post_logic(title, content, author):
    # 1. Ask the Model (Warehouse) to save the new post
    new_post = Post.add_post(title, content, author)

    # 2. Turn the single Post object into a dictionary
    post_dict = new_post.to_dict()
    
    # 3. Wrap it with a status and message, ready for the frontend
    return {
        "status": "success",
        "message": "Post created successfully",
        "data": post_dict
    }

def get_posts_logic():
    # 1. Ask the Model (Warehouse) for all saved posts
    all_posts = Post.get_all_posts()

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
    },200