# This file is like a "Warehouse" that stores post data
from extensions import db
from datetime import datetime

# class PostModel:
#     # This list acts as our temporary in-memory "database"
#     posts = []

#     @staticmethod
#     def add_post(title, content, author):
#         # Create a new post as a dictionary
#         new_post = {
#             "id": len(PostModel.posts) + 1,   # simple auto-increment ID
#             "title": title,
#             "content": content,
#             "author": author,
#             "created_at": datetime.now().isoformat()  # e.g. "2026-08-07T10:23:00"
#         }
#         PostModel.posts.append(new_post)
#         return new_post

#     @staticmethod
#     def get_all_posts():
#         return PostModel.posts

class Post(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    content = db.Column(db.Text, nullable=False)
    author = db.Column(db.String(100), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    @staticmethod
    def add_post(title, content, author):
        # Create a new Post object
        new_post = Post(title=title, content=content, author=author)

        # Add it to the database session
        db.session.add(new_post)

        # Actually save it to the database file
        db.session.commit()

        return new_post

    @staticmethod
    def get_all_posts():
        # Ask the database for every row in the posts table
        return Post.query.all()

    # This converts one Post object into a dictionary
    def to_dict(self):
        return {
            "id": self.id,
            "title": self.title,
            "content": self.content,
            "author": self.author,
            "created_at": self.created_at.isoformat()
        }