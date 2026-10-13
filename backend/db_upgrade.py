# backend/db_upgrade.py
# Lightweight stop-gap for schema drift on the users table.
#
# db.create_all() creates missing TABLES, but never adds new COLUMNS to a table
# that already exists. A local database created before these columns existed
# would therefore crash on login with "no such column: users.role".
# This adds any missing columns and leaves all existing data untouched.
# It is safe to run on every startup (it does nothing once columns exist).
#
# Replace with proper migrations (e.g. Flask-Migrate) when the project adopts them.
from sqlalchemy import inspect, text

USER_COLUMNS = {
    'agreed_to_terms': 'BOOLEAN DEFAULT 0',
    'terms_version': 'VARCHAR(20)',
    'terms_accepted_at': 'DATETIME',
    'role': "VARCHAR(20) DEFAULT 'student'",
}


def add_missing_user_columns(db):
    inspector = inspect(db.engine)
    if 'users' not in inspector.get_table_names():
        return []

    existing = {column['name'] for column in inspector.get_columns('users')}
    added = []
    with db.engine.begin() as connection:
        for name, definition in USER_COLUMNS.items():
            if name not in existing:
                connection.execute(text(f'ALTER TABLE users ADD COLUMN {name} {definition}'))
                added.append(name)
    return added
