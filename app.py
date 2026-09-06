import os

from flask import Flask, jsonify, render_template, request

from models import Task, db


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'DATABASE')


def create_app():
    app = Flask(__name__)
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE_PATH}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

    db.init_app(app)

    with app.app_context():
        db.create_all()

    return app


app = create_app()


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/tasks', methods=['GET'])
def get_tasks():
    tasks = Task.query.order_by(Task.id.asc()).all()
    return jsonify([task.to_dict() for task in tasks]), 200


@app.route('/api/tasks', methods=['POST'])
def create_task():
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    task = Task(title=title, completed=bool(data.get('completed', False)))
    db.session.add(task)
    db.session.commit()

    return jsonify(task.to_dict()), 201


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
def update_task(task_id):
    task = Task.query.get_or_404(task_id)
    data = request.get_json(silent=True) or {}

    if 'title' in data:
        cleaned_title = str(data['title']).strip()
        if cleaned_title:
            task.title = cleaned_title

    if 'completed' in data:
        task.completed = bool(data['completed'])

    db.session.commit()
    return jsonify(task.to_dict()), 200


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
def delete_task(task_id):
    task = Task.query.get_or_404(task_id)
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200
