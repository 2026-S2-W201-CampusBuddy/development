from extensions import db
from datetime import datetime

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # Post foreign key
    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)

    # Parent comment foreign key for replies
    parent_id = db.Column(db.Integer, db.ForeignKey('comment.id'), nullable=True)

    @staticmethod
    def add_comment(post_id, content, author, parent_id=None):
        new_comment = Comment(
            post_id=post_id,
            content=content,
            author=author,
            parent_id=parent_id
        )
        db.session.add(new_comment)
        db.session.commit()
        return new_comment
    
    @staticmethod
    def get_comments_for_post(post_id):
        return Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()

    # Update existing comment method
    def update_comment(self, content):
        self.content = content
        db.session.commit()
        return self

    # Delete comment method
    def delete_comment(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "parent_id": self.parent_id,
            "content": self.content,
            "author": self.author,
            "created_at": self.created_at.isoformat() + "Z"
        }