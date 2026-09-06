from app import app
from models import Task


with app.app_context():
    tasks = Task.query.order_by(Task.id.asc()).all()

    if not tasks:
        print('No tasks found.')
    else:
        for task in tasks:
            print(task.to_dict())
