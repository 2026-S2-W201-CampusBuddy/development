# This file is like a "Warehouse" that stores comment data
from extensions import db
from datetime import datetime

class Comment(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    post_id = db.Column(db.Integer, db.ForeignKey('post.id'), nullable=False)

    @staticmethod
    def add_comment(post_id, content, author):
        new_comment = Comment(post_id=post_id, content=content, author=author)
        db.session.add(new_comment)
        db.session.commit()
        return new_comment
    
    @staticmethod
    def get_comments_for_post(post_id):
        return Comment.query.filter_by(post_id=post_id).order_by(Comment.created_at.asc()).all()

    # This converts one Comment object into a dictionary
    def to_dict(self):
        return {
            "id": self.id,
            "post_id": self.post_id,
            "content": self.content,
            "author": self.author,
            "created_at": self.created_at.isoformat()
        }