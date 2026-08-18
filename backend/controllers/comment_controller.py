from models.comment_model import Comment
from models.post_model import Post

def create_comment_logic(post_id, content, author):
    post = Post.query.get(post_id)
    if not post:
        return{
            "status": "error",
            "message": "Post not found"
            }, 404

    new_comment = Comment.add_comment(post_id, content, author)

    return {
        "status": "success",
        "message": "Comment created successfully",
        "data": new_comment.to_dict()
    },201

def get_comments_logic(post_id):
    post = Post.query.get(post_id)
    if not post:
        return {
            "status": "error",
            "message": "Post not found"
        }, 404

    comments = Comment.get_comments_for_post(post_id)
    comments_list = [comment.to_dict() for comment in comments]

    return {
        "status": "success",
        "message": "Comments retrieved successfully",
        "data": comments_list
    }, 200