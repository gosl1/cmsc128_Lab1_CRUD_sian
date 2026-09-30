import pytest

from app import app, db, User, PasswordResetToken


@pytest.fixture
def client():
    app.config['TESTING'] = True
    app.config['WTF_CSRF_ENABLED'] = False
    app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'
    with app.app_context():
        db.drop_all()
        db.create_all()
    with app.test_client() as client:
        yield client
    with app.app_context():
        db.drop_all()


def test_registration_and_login_flow(client):
    response = client.post('/api/register', json={
        'username': 'alice@example.com',
        'display_name': 'Alice',
        'password': 'securePass123'
    })
    assert response.status_code == 201
    data = response.get_json()
    assert data['username'] == 'alice@example.com'
    assert data['display_name'] == 'Alice'

    user = User.query.filter_by(username='alice@example.com').first()
    assert user is not None
    assert user.password_hash != 'securePass123'

    response = client.post('/api/login', json={
        'username': 'alice@example.com',
        'password': 'securePass123'
    })
    assert response.status_code == 200
    assert response.get_json()['message'] == 'Login successful'

    response = client.get('/api/profile')
    assert response.status_code == 200
    assert response.get_json()['user']['username'] == 'alice@example.com'


def test_task_routes_require_login(client):
    response = client.get('/api/tasks')
    assert response.status_code == 401

    client.post('/api/register', json={
        'username': 'bob@example.com',
        'display_name': 'Bob',
        'password': 'PassWord123!'
    })
    client.post('/api/login', json={
        'username': 'bob@example.com',
        'password': 'PassWord123!'
    })

    response = client.post('/api/tasks', json={'title': 'Study auth'})
    assert response.status_code == 201
    assert response.get_json()['title'] == 'Study auth'


def test_password_reset_flow(client):
    client.post('/api/register', json={
        'username': 'carol@example.com',
        'display_name': 'Carol',
        'password': 'oldPassword123!'
    })

    response = client.post('/api/password-reset/request', json={'username': 'carol@example.com'})
    assert response.status_code == 200
    token = PasswordResetToken.query.first().token

    response = client.post('/api/password-reset/confirm', json={
        'token': token,
        'password': 'newPassword456!'
    })
    assert response.status_code == 200

    user = User.query.filter_by(username='carol@example.com').first()
    assert user.check_password('oldPassword123!') is False
    assert user.check_password('newPassword456!') is True
