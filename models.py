from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()

class Task(db.Model):
    __tablename__ = 'tasks'

    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    due_date = db.Column(db.String(20), nullable=True)
    priority = db.Column(db.String(10), default='Med', nullable=False)
    category = db.Column(db.String(20), default='Others', nullable=False)
    completed = db.Column(db.Boolean, default=False, nullable=False)
    created_at = db.Column(db.DateTime, server_default=db.func.now(), nullable=False)

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
        }