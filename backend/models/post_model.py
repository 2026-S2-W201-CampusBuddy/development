from extensions import db
from datetime import datetime

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), nullable=False)
    category = db.Column(db.String(50), nullable=False, default='general')
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def add_post(title, content, author, category='general'):
        new_post = Post(
            title=title,
            content=content,
            author=author,
            category=category
        )
        db.session.add(new_post)
        db.session.commit()
        return new_post

    @staticmethod
    def get_all_posts(category=None):
        if category:
            return Post.query.filter_by(category=category).order_by(Post.created_at.desc()).all()
        return Post.query.order_by(Post.created_at.desc()).all()

    # Update existing post
    def update_post(self, title, content):
        self.title = title
        self.content = content
        db.session.commit()
        return self

    # Delete post from database
    def delete_post(self):
        db.session.delete(self)
        db.session.commit()

    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "author": self.author,
            "category": self.category,
            "created_at": self.created_at.isoformat() + "Z"
        }