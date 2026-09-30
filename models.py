from datetime import datetime, timezone

from flask_login import UserMixin
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import check_password_hash, generate_password_hash


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


db = SQLAlchemy()


# AUTHENTICATION FOUNDATION
# This project adds real user accounts, session-based login, and password hashing.
# The following model is the foundation for the next activity: one user can own
# many tasks, and each task must be tied to a specific account.
class User(db.Model, UserMixin):
    __tablename__ = 'users'

    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False, index=True)
    email = db.Column(db.String(120), unique=True, nullable=True, index=True)
    display_name = db.Column(db.String(80), nullable=False)
    password_hash = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)

    tasks = db.relationship('Task', back_populates='owner', cascade='all, delete-orphan')
    reset_tokens = db.relationship('PasswordResetToken', back_populates='user', cascade='all, delete-orphan')

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

    def to_public_dict(self):
        return {
            'id': self.id,
            'username': self.username,
            'email': self.email,
            'display_name': self.display_name,
            'created_at': self.created_at.isoformat() if self.created_at else None,
        }


class PasswordResetToken(db.Model):
    __tablename__ = 'password_reset_tokens'

    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=False)
    token = db.Column(db.String(200), unique=True, nullable=False, index=True)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    expires_at = db.Column(db.DateTime, nullable=False)
    used = db.Column(db.Boolean, default=False, nullable=False)

    user = db.relationship('User', back_populates='reset_tokens')


# NEXT ACTIVITY FOUNDATION: per-user to-do list design
# Each task is assigned to exactly one user using user_id.
# This is what makes the app a multi-user todo system instead of a single shared list.
class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    due_date = db.Column(db.String(20), nullable=True)
    priority = db.Column(db.String(10), default='Med', nullable=False)
    category = db.Column(db.String(20), default='Others', nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    # This field is the key to the next activity: tasks are scoped to the logged-in user.
    user_id = db.Column(db.Integer, db.ForeignKey('users.id'), nullable=True, index=True)

    owner = db.relationship('User', back_populates='tasks')

    def __repr__(self):
        return f"Task(id={self.id}, title={self.title!r}, completed={self.completed})"

    def to_dict(self):
        return {
            'id': self.id,
            'title': self.title,
            'due_date': self.due_date,
            'priority': self.priority,
            'category': self.category,
            'completed': self.completed,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'user_id': self.user_id,
        }