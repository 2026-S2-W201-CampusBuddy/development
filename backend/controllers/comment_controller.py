# This file is like a "Chef" who handles the logic for posts
from models.comment_model import CommentModel

def create_comment_logic(post_id, content, author):
    # 1. Ask the Model (Warehouse) to save the new comment
    new_comment = CommentModel.add_comment(post_id, content, author)
    
    # 2. Wrap it with a status and message, ready for the frontend
    return {
        "status": "success",
        "message": "Comment created successfully",
        "data": new_comment
    }