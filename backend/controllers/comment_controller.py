from models.comment_model import Comment
from models.post_model import Post

def create_comment_logic(post_id, content, author, parent_id=None):
    post = Post.query.get(post_id)
    if not post:
        return {
            "status": "error",
            "message": "Post not found"
        }, 404

    if parent_id:
        parent_comment = Comment.query.get(parent_id)
        if not parent_comment or parent_comment.post_id != post_id:
            return {
                "status": "error",
                "message": "Parent comment not found"
            }, 404

    new_comment = Comment.add_comment(post_id, content, author, parent_id)
    return {
        "status": "success",
        "message": "Comment created successfully",
        "data": new_comment.to_dict()
    }, 201

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

# Update comment only if current user is the author
def update_comment_logic(post_id, comment_id, content, author):
    comment = Comment.query.filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        return {
            "status": "error",
            "message": "Comment not found"
        }, 404

    if comment.author != author:
        return {
            "status": "error",
            "message": "You can only edit your own comments"
        }, 403

    comment.update_comment(content)
    return {
        "status": "success",
        "message": "Comment updated successfully",
        "data": comment.to_dict()
    }, 200

# Delete comment only if current user is the author
def delete_comment_logic(post_id, comment_id, author):
    comment = Comment.query.filter_by(id=comment_id, post_id=post_id).first()
    if not comment:
        return {
            "status": "error",
            "message": "Comment not found"
        }, 404

    if comment.author != author:
        return {
            "status": "error",
            "message": "You can only delete your own comments"
        }, 403

    # Delete child replies if any
    Comment.query.filter_by(parent_id=comment_id).delete()
    comment.delete_comment()

    return {
        "status": "success",
        "message": "Comment deleted successfully"
    }, 200