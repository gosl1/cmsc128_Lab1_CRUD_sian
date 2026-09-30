import os
import secrets
from datetime import datetime, timedelta, timezone

from flask import Flask, jsonify, render_template, request
from flask_login import LoginManager, current_user, login_required, login_user, logout_user
from sqlalchemy import inspect, text

from models import PasswordResetToken, Task, User, db


BASE_DIR = os.path.abspath(os.path.dirname(__file__))
DATABASE_PATH = os.path.join(BASE_DIR, 'DATABASE')


def utc_now():
    return datetime.now(timezone.utc).replace(tzinfo=None)


login_manager = LoginManager()
login_manager.login_view = 'home'


def ensure_schema():
    inspector = inspect(db.engine)
    tables = set(inspector.get_table_names())

    if 'users' not in tables:
        db.create_all()

    if 'password_reset_tokens' not in tables:
        db.create_all()

    if 'tasks' in tables:
        task_columns = {column['name'] for column in inspector.get_columns('tasks')}
        if 'user_id' not in task_columns:
            with db.engine.begin() as connection:
                connection.execute(text('ALTER TABLE tasks ADD COLUMN user_id INTEGER'))

    if 'users' in tables:
        user_columns = {column['name'] for column in inspector.get_columns('users')}
        if 'email' not in user_columns:
            with db.engine.begin() as connection:
                connection.execute(text('ALTER TABLE users ADD COLUMN email VARCHAR(120)'))

    if 'password_reset_tokens' not in tables:
        db.create_all()

    db.session.commit()


def create_app():
    app = Flask(__name__)
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'cmsc128-dev-secret-key')
    app.config['SQLALCHEMY_DATABASE_URI'] = f'sqlite:///{DATABASE_PATH}'
    app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

    db.init_app(app)
    login_manager.init_app(app)

    with app.app_context():
        db.create_all()
        ensure_schema()

    return app


app = create_app()


@login_manager.user_loader
def load_user(user_id):
    return db.session.get(User, int(user_id))


@login_manager.unauthorized_handler
def unauthorized():
    return jsonify({'error': 'Authentication required.'}), 401


@app.route('/')
def home():
    return render_template('index.html')


@app.route('/api/register', methods=['POST'])
def register_user():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    display_name = (data.get('display_name') or '').strip()
    password = data.get('password', '')

    if not username or not display_name or not password:
        return jsonify({'error': 'Username, display name, and password are required.'}), 400

    if len(password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long.'}), 400

    if User.query.filter((User.username == username) | (User.email == username)).first():
        return jsonify({'error': 'That username or email is already registered.'}), 409

    user = User(username=username, email=username if '@' in username else None, display_name=display_name)
    user.set_password(password)
    db.session.add(user)
    db.session.commit()

    return jsonify({
        'id': user.id,
        'username': user.username,
        'email': user.email,
        'display_name': user.display_name,
        'message': 'Registration successful.'
    }), 201


@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json(silent=True) or {}
    username = (data.get('username') or '').strip()
    password = data.get('password', '')

    if not username or not password:
        return jsonify({'error': 'Username and password are required.'}), 400

    user = User.query.filter((User.username == username) | (User.email == username)).first()
    if user is None or not user.check_password(password):
        return jsonify({'error': 'Invalid username or password.'}), 401

    login_user(user)
    return jsonify({
        'message': 'Login successful',
        'user': user.to_public_dict()
    }), 200


@app.route('/api/logout', methods=['POST'])
def logout():
    logout_user()
    return jsonify({'message': 'Logged out successfully.'}), 200


@app.route('/api/profile', methods=['GET'])
@login_required
def get_profile():
    return jsonify({'user': current_user.to_public_dict()}), 200


@app.route('/api/profile', methods=['PUT'])
@login_required
def update_profile():
    data = request.get_json(silent=True) or {}

    if 'display_name' in data:
        cleaned_name = (str(data.get('display_name') or '')).strip()
        if not cleaned_name:
            return jsonify({'error': 'Display name cannot be empty.'}), 400
        current_user.display_name = cleaned_name

    if 'username' in data:
        new_username = (str(data.get('username') or '')).strip()
        if not new_username:
            return jsonify({'error': 'Username cannot be empty.'}), 400
        if new_username != current_user.username:
            other_user = User.query.filter((User.username == new_username) | (User.email == new_username)).first()
            if other_user and other_user.id != current_user.id:
                return jsonify({'error': 'That username or email is already in use.'}), 409
            current_user.username = new_username
            current_user.email = new_username if '@' in new_username else current_user.email

    if 'password' in data:
        new_password = str(data.get('password') or '')
        if len(new_password) < 8:
            return jsonify({'error': 'Password must be at least 8 characters long.'}), 400
        current_user.set_password(new_password)

    db.session.commit()
    return jsonify({'message': 'Profile updated successfully.', 'user': current_user.to_public_dict()}), 200


@app.route('/api/password-reset/request', methods=['POST'])
def request_password_reset():
    data = request.get_json(silent=True) or {}
    identifier = (data.get('username') or '').strip()

    if not identifier:
        return jsonify({'error': 'A username or email is required.'}), 400

    user = User.query.filter((User.username == identifier) | (User.email == identifier)).first()
    if user is None:
        return jsonify({'message': 'If an account exists for that username/email, a reset token has been prepared.'}), 200

    PasswordResetToken.query.filter_by(user_id=user.id).delete()
    token = secrets.token_urlsafe(24)
    reset_token = PasswordResetToken(
        user_id=user.id,
        token=token,
        expires_at=utc_now() + timedelta(minutes=30),
    )
    db.session.add(reset_token)
    db.session.commit()

    return jsonify({
        'message': 'If an account exists for that username/email, a reset token has been prepared.',
        'token': token,
        'expires_in_minutes': 30,
    }), 200


@app.route('/api/password-reset/confirm', methods=['POST'])
def confirm_password_reset():
    data = request.get_json(silent=True) or {}
    token_value = (data.get('token') or '').strip()
    new_password = data.get('password', '')

    if not token_value or not new_password:
        return jsonify({'error': 'Token and new password are required.'}), 400

    if len(new_password) < 8:
        return jsonify({'error': 'Password must be at least 8 characters long.'}), 400

    reset_token = PasswordResetToken.query.filter_by(token=token_value).first()
    if reset_token is None or reset_token.used or reset_token.expires_at < utc_now():
        return jsonify({'error': 'The password reset link is invalid or expired.'}), 400

    user = db.session.get(User, reset_token.user_id)
    if user is None:
        return jsonify({'error': 'The account for this reset token no longer exists.'}), 404

    user.set_password(new_password)
    reset_token.used = True
    db.session.commit()

    return jsonify({'message': 'Password updated successfully. You can now log in with your new password.'}), 200


# NEXT ACTIVITY FOUNDATION: user-specific todo list behavior.
# Each task is filtered by the authenticated user, so one account cannot see or modify
# another account's tasks. This is the core restriction required for the next activity.
@app.route('/api/tasks', methods=['GET'])
@login_required
def get_tasks():
    tasks = Task.query.filter_by(user_id=current_user.id).order_by(Task.id.asc()).all()
    return jsonify([task.to_dict() for task in tasks]), 200


@app.route('/api/tasks', methods=['POST'])
@login_required
def create_task():
    data = request.get_json(silent=True) or {}
    title = (data.get('title') or '').strip()

    if not title:
        return jsonify({'error': 'Title is required'}), 400

    task = Task(
        title=title,
        due_date=data.get('due_date'),
        priority=data.get('priority', 'Med'),
        category=data.get('category', 'Others'),
        completed=bool(data.get('completed', False)),
        # NEXT ACTIVITY FOUNDATION: every task is associated with the logged-in user.
        user_id=current_user.id,
    )

    db.session.add(task)
    db.session.commit()

    return jsonify(task.to_dict()), 201


@app.route('/api/tasks/<int:task_id>', methods=['PUT'])
@login_required
def update_task(task_id):
    # NEXT ACTIVITY FOUNDATION: only the current authenticated user may edit their own task.
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    data = request.get_json(silent=True) or {}

    if 'title' in data:
        cleaned_title = str(data['title']).strip()
        if cleaned_title:
            task.title = cleaned_title

    if 'due_date' in data:
        task.due_date = data['due_date']

    if 'priority' in data:
        task.priority = data['priority']

    if 'category' in data:
        task.category = data['category']

    if 'completed' in data:
        task.completed = bool(data['completed'])

    db.session.commit()

    return jsonify(task.to_dict()), 200


@app.route('/api/tasks/<int:task_id>', methods=['DELETE'])
@login_required
def delete_task(task_id):
    # NEXT ACTIVITY FOUNDATION: only the current authenticated user may delete their own task.
    task = Task.query.filter_by(id=task_id, user_id=current_user.id).first_or_404()
    db.session.delete(task)
    db.session.commit()
    return jsonify({'message': 'Task deleted'}), 200


if __name__ == '__main__':
    app.run(debug=True)