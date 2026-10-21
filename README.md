# CMSC 128 Lab 3: Multi-Account To-Do Lists (UBAC)

This project combines the Activity 1 to-do CRUD application with Activity 2 registration, login, password hashing, and persistent sessions. Each authenticated account has a private personal list and can participate in collaborative lists.

## Features

- Register and log in using a username or email; passwords are stored as Werkzeug password hashes.
- Persistent SQLite accounts, personal tasks, collaborative lists, memberships, and password-reset tokens.
- Personal tasks are visible and editable only by their owner.
- Create collaborative lists, add registered users by username or email, and see lists you own or have joined.
- Members can create, view, edit, complete, and delete tasks in lists they belong to.
- Flask-Login protects profile, list, membership, and task endpoints. The server checks list membership and task ownership for every operation.
- Profile editing, logout, and a local password-reset flow are included.

## Activity 1 + Activity 2 Integration

Activity 2 was developed on `act2-accounts`, branched from `main`, which contained the Activity 1 CRUD app. This preserves Activity 1 in the Activity 2 branch history; the CRUD interface and routes were extended to use authenticated accounts rather than replaced with a separate application.

For Activity 3, `act3-ubac` was created from `act2-accounts`. That branch already contains the Activity 1 base and Activity 2 authentication commits, so the integration retains the existing Git history and does not copy files manually. No merge conflict was encountered when creating the Activity 3 branch. Submit `act3-ubac` through a pull request rather than developing directly on `main`.

## Data Model

- `users`: account identity and password hash.
- `tasks`: task details, `user_id` for the creating/owning account, and nullable `list_id`. Personal tasks have no `list_id`; collaborative tasks point to a collaborative list.
- `collaborative_lists`: list name and `owner_id`. The owner may add other registered users.
- `collaborative_list_memberships`: unique `(list_id, user_id)` membership rows. The owner is authorized through `owner_id` and does not need a duplicate membership row.
- `password_reset_tokens`: one-time reset token, owning user, creation/expiry timestamps, and used status. Account passwords themselves are hashed.

The SQLite database file is `DATABASE` in the project root. Existing Activity 2 records are preserved; startup adds the collaborative-list tables and the task `list_id` column when needed. New personal and collaborative tasks are assigned to the authenticated user, and the database does not duplicate user profile data in task records.

## Authorization and Example API Operations

The UI selection is not trusted as authorization. Protected endpoints check the session user on the server:

| Operation | Endpoint | Server-side access rule |
| --- | --- | --- |
| Register / login | `POST /api/register`, `POST /api/login` | Creates a password hash or authenticates credentials |
| Read visible collaborative lists | `GET /api/lists` | Returns only lists owned by the user or where they have a membership |
| Create a collaborative list | `POST /api/lists` | Sets `owner_id` from the logged-in session |
| Add a member | `POST /api/lists/<list_id>/members` | Requires the logged-in user to own the list |
| Read personal tasks | `GET /api/tasks` | Filters by the current user's `user_id` |
| Read shared tasks | `GET /api/tasks?list_id=<id>` | Requires owner or membership access to that list |
| Create a task | `POST /api/tasks` | Uses the session user as `user_id`; shared-list creation also checks membership |
| Update / delete a task | `PUT/DELETE /api/tasks/<task_id>` | Requires personal ownership or access to the task's collaborative list |
| Read / update profile | `GET/PUT /api/profile` | Requires authentication and accesses only `current_user` |

An inaccessible or unknown list/task returns a 404-style response, preventing ID changes from revealing another user's private data. An unauthenticated request returns 401.

## Local Installation and Run

1. Install Python 3 and open a terminal in the repository root.
2. (Recommended) Create and activate a virtual environment.
3. Install dependencies:

   ```bash
   python -m pip install -r requirements.txt
   ```

4. Set a unique `SECRET_KEY` in the shell before starting the app. In PowerShell:

   ```powershell
   $env:SECRET_KEY = "replace-with-a-long-random-secret"
   ```

   `app.py` reads the environment variable directly; it does not automatically load values from `.env`.
5. Start the server:

   ```bash
   python app.py
   ```

6. Open <http://127.0.0.1:5000/>. Register two separate demo accounts through the registration page, create 3-5 personal tasks for each, and use one account to create a collaborative list and add the other by username/email.

The local password-reset request returns its token in the response for demonstration; it does not send email. Do not use the development fallback secret or local reset flow for a public deployment.

## Manual Activity 3 Verification

1. Register User A and User B through the application.
2. Create personal tasks under both accounts and verify each account sees only its own.
3. As User A, create a collaborative list and add User B by username or email.
4. Confirm the list and its tasks appear for both users, while a separate list owned by User B does not appear for User A unless User A is added.
5. Create, edit, complete, and delete a shared task as each member.
6. While logged in as User B, try changing a User A-only task ID in a request. The server must return 404 and leave the task unchanged.
7. Refresh the page and restart the backend. Confirm the session and each user's personal/shared lists and tasks persist.

## Tech Stack

| Layer | Choice |
| --- | --- |
| Backend | Python + Flask |
| Authentication | Flask-Login |
| ORM / database | Flask-SQLAlchemy + SQLite |
| Password hashing | Werkzeug |
| Frontend | HTML, CSS, and vanilla JavaScript |
