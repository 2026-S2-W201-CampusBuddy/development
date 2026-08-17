# This file is like a "Warehouse" that stores comment data
from datetime import datetime

class CommentModel:
    # This list acts as our temporary in-memory "database"
    comments = []

    @staticmethod
    def add_comment(post_id, content, author):
        new_comment = {
            "id": len(CommentModel.comments) + 1,   # simple auto-increment ID
            "post_id": post_id,                     # which post this comment belongs to
            "content": content,
            "author": author,
            "created_at": datetime.now().isoformat()
        }
        CommentModel.comments.append(new_comment)
        return new_comment