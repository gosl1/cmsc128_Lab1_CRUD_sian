import json

from app import app, db
from models import Task


app.config['TESTING'] = True
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///:memory:'


def test_task_crud_flow():
    with app.app_context():
        db.drop_all()
        db.create_all()

        client = app.test_client()

        response = client.post('/api/tasks', json={'title': 'Buy milk'})
        assert response.status_code == 201
        payload = response.get_json()
        assert payload['title'] == 'Buy milk'
        assert payload['completed'] is False

        task_id = payload['id']

        get_response = client.get('/api/tasks')
        assert get_response.status_code == 200
        tasks = get_response.get_json()
        assert len(tasks) == 1
        assert tasks[0]['id'] == task_id

        update_response = client.put(f'/api/tasks/{task_id}', json={'completed': True})
        assert update_response.status_code == 200
        updated = update_response.get_json()
        assert updated['completed'] is True

        delete_response = client.delete(f'/api/tasks/{task_id}')
        assert delete_response.status_code == 200
        assert delete_response.get_json()['message'] == 'Task deleted'

        final_response = client.get('/api/tasks')
        assert final_response.status_code == 200
        assert final_response.get_json() == []
