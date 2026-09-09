# To-Do List App

A simple to-do list website with due dates, priority, categories, and undo-on-delete.

## Tech Stack

| Layer      | Choice                              |
|------------|--------------------------------------|
| Backend    | Python + Flask                       |
| ORM        | Flask-SQLAlchemy                     |
| Database   | SQLite (file-based)                  |
| Frontend   | Vanilla HTML / CSS / JavaScript (no framework) |

**Why this stack?**

- **Flask** — The project requires a framework that can run a web server, and Flask is simple enough for this project.
- **SQLite** — Small and necessary for a small project like this. A separate database server is not needed 
- **Flask-SQLAlchemy** — It makes working with the database easier. Instead of writing SQL queries manually, I can use the Task model and queries like Task.query.order_by(...).
- **Vanilla JS on the frontend** — The app isn't very complicated. It's basically one list with add, edit, complete, delete, and undo, so I didn't think React or Vue was necessary. Plain JavaScript and fetch() were enough.

## Project Structure

```
todo_app/
├── app.py                 # Flask routes (CRUD API + page route)
├── models.py               # SQLAlchemy Task model
├── templates/
│   └── index.html          # Page shell, rendered by Flask
└── static/
    ├── css/style.css
    └── js/main.js           # Fetches the API, renders the list, handles interactions
```

## Running It Locally

**Requirements:** Python 3.9+

1. **Clone / download the project**, and `cd` into the project root (the folder containing `app.py`).

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Run the app:**
   ```bash
   python -c "from app import app; app.run(debug=True)"
   ```
   (`app.py` doesn't currently define an `if __name__ == '__main__'` block, so this one-liner is used to start the dev server. Alternatively, add `app.run(debug=True)` at the bottom of `app.py` and just run `python3 app.py`.)

5. **Open the app:** visit **http://127.0.0.1:5000/** in your browser.

On first run, Flask-SQLAlchemy automatically creates the SQLite file (`DATABASE`) and the `tasks` table — no migration step needed.

## API Endpoints

All endpoints are prefixed with `/api/tasks` and exchange JSON.

| Method | Endpoint             | Description                          | Body (JSON)                                                                 |
|--------|-----------------------|---------------------------------------|-------------------------------------------------------------------------------|
| GET    | `/api/tasks`          | List all tasks, ordered by id         | —                                                                              |
| POST   | `/api/tasks`          | Create a task                         | `{ "title": "...", "due_date": "...", "priority": "Low\|Med\|High", "category": "School\|Personal\|Others", "completed": false }` — only `title` is required |
| PUT    | `/api/tasks/<id>`     | Update one or more fields of a task   | Any subset of the fields above                                                |
| DELETE | `/api/tasks/<id>`     | Delete a task                         | —                                                                              |

**Example — create a task:**
```bash
curl -X POST http://127.0.0.1:5000/api/tasks \
  -H "Content-Type: application/json" \
  -d '{
        "title": "Finish CMSC 142 problem set",
        "priority": "High",
        "category": "School",
        "due_date": "2026-09-12T18:00"
      }'
```
Response (`201 Created`):
```json
{
  "id": 1,
  "title": "Finish CMSC 142 problem set",
  "due_date": "2026-09-12T18:00",
  "priority": "High",
  "category": "School",
  "completed": false,
  "created_at": "2026-09-09T07:35:29"
}
```

**Example — mark a task complete:**
```bash
curl -X PUT http://127.0.0.1:5000/api/tasks/1 \
  -H "Content-Type: application/json" \
  -d '{"completed": true}'
```

**Example — delete a task:**
```bash
curl -X DELETE http://127.0.0.1:5000/api/tasks/1
```
(The frontend deletes immediately on the server but keeps a local copy for 5 seconds to support the "Undo" toast — undo re-creates the task via a fresh `POST`, so a restored task gets a new `id`.)

## Data Model

```python
Task
├── id            int, primary key
├── title         str, required
├── due_date      str, optional (ISO datetime string)
├── priority      str, default "Med"      # "Low" | "Med" | "High"
├── category      str, default "Others"   # "School" | "Personal" | "Others"
├── completed     bool, default False
└── created_at    datetime, set automatically on insert
```

## Screenshots

**Main list view** — tasks with priority, category, and due date shown; completed tasks are struck through:

![Main to-do list view](screenshots/main-view.png)

**Adding a task** — due date, priority, and category are set from the form before submitting:

![Filling out the add-task form](screenshots/add-task-form.png)