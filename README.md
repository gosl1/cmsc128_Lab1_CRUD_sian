# CMSC 128 Lab 2: Authentication and User Access

This project continues the Activity 1 to-do app by adding a secure account system, protected routes, session persistence, and profile/password recovery features.

## Overview

The app uses a Flask backend with SQLite persistence and a simple HTML/CSS/JavaScript frontend. Users can:

- Create an account
- Log in with either a username or email and password
- Stay logged in after refreshes using Flask-Login sessions
- Update profile info and change passwords
- Request a password reset token and set a new password
- Access a protected to-do dashboard only while authenticated

## Tech Stack

| Layer | Choice |
| --- | --- |
| Backend | Python + Flask |
| Authentication | Flask-Login |
| ORM | Flask-SQLAlchemy |
| Database | SQLite |
| Frontend | Vanilla HTML, CSS, JavaScript |
| Password hashing | Werkzeug `generate_password_hash` / `check_password_hash` |

This stack matches the original lab project and keeps the implementation simple while meeting the requirement for real database persistence and session-based authentication.

## Features Implemented

- Account registration with username/email, display name, and secure password hashing
- Login validation and authenticated session cookies
- Protected dashboard and task routes
- Logout endpoint that destroys the active authentication state
- Profile page updates for username/email, display name, and password
- Password reset request + confirmation flow using a time-limited token
- SQLite persistence for both account records and task records

## Project Structure

```text
cmsc128-Lab1_CRUD_Sian/
├── app.py                     # Flask app, auth routes, session logic, task routes
├── models.py                  # SQLAlchemy models for User, Task, and password reset tokens
├── DATABASE                  # SQLite database file (generated locally)
├── templates/
│   └── index.html            # Auth + dashboard UI shell
├── static/
│   ├── css/style.css        # Styling for auth screens, dashboard, and tasks
│   └── js/main.js            # Client-side auth and task interactions
├── tests/
│   └── test_auth.py          # Regression tests covering registration/login/reset behavior
├── requirements.txt
├── .env.example              # Template for environment variable configuration
├── .gitignore                # Ignores secrets and generated local files
├── README.md
└── screenshots/              # Existing app screenshots
```

## Local Installation

1. Open a terminal in the project root.
2. Create and activate a virtual environment if desired.
3. Install dependencies:

```bash
python -m pip install -r requirements.txt
```

4. Set a secret key in the environment or copy the example file:

```bash
copy .env.example .env
```

Then edit `.env` and set a secure value for `SECRET_KEY`.

5. Run the app:

```bash
python -c "from app import app; app.run(host='127.0.0.1', port=5000, debug=True)"
```

6. Open the browser at:

```text
http://127.0.0.1:5000/
```

## Database Setup and Persistence

The project uses a local SQLite file named `DATABASE` in the project root. The database is created automatically when the Flask app starts.

The models include:

- User
  - id
  - username
  - email
  - display_name
  - password_hash
  - created_at
- Task
  - id
  - title
  - due_date
  - priority
  - category
  - completed
  - user_id
  - created_at
- PasswordResetToken
  - id
  - user_id
  - token
  - created_at
  - expires_at
  - used

This means account data and task data remain saved across browser refreshes and app restarts so long as the SQLite file remains present.

## Authentication and Session Mechanism

The app uses Flask-Login session cookies to persist the authenticated user state. After a successful login, the user receives a session cookie that remains active across browser refreshes and navigation. Logging out clears the session.

Password protection is handled with Werkzeug hashing instead of storing plain text. The password is never displayed or stored in raw form.

## Password Recovery Flow

The password reset flow works as follows:

1. The user submits a username/email to `/api/password-reset/request`.
2. The server validates the account and generates a time-limited reset token.
3. The user submits that token and a new password to `/api/password-reset/confirm`.
4. The server updates the password hash and marks the token as used.

This is a demo/local reset mechanism; it does not send an actual email, so it is suitable for local development and defense demonstration.

## Example API Calls

### Register

```bash
curl -X POST http://127.0.0.1:5000/api/register \
  -H "Content-Type: application/json" \
  -d '{
        "username": "alice@example.com",
        "display_name": "Alice",
        "password": "securePass123"
      }'
```

### Login

```bash
curl -X POST http://127.0.0.1:5000/api/login \
  -H "Content-Type: application/json" \
  -d '{
        "username": "alice@example.com",
        "password": "securePass123"
      }'
```

### Get profile (authenticated)

```bash
curl http://127.0.0.1:5000/api/profile
```

### Request password reset

```bash
curl -X POST http://127.0.0.1:5000/api/password-reset/request \
  -H "Content-Type: application/json" \
  -d '{"username": "alice@example.com"}'
```

### Confirm password reset

```bash
curl -X POST http://127.0.0.1:5000/api/password-reset/confirm \
  -H "Content-Type: application/json" \
  -d '{
        "token": "<reset-token>",
        "password": "newPassword456!"
      }'
```

## Next Activity Foundation

This implementation already establishes the key pattern for the next activity: a user-specific to-do list.

- `User` and `Task` are separate database models.
- Each task stores a `user_id` so it can be assigned to a single account.
- Task routes are filtered by `current_user.id`, which means one account cannot read or change another account's tasks.
- This is the core user-isolation logic required for a personal to-do list system.

## Security Notes

- Passwords are hashed before storage.
- Secrets are expected to live in a local `.env` file and are ignored by Git.
- Account and task routes require authentication.
- The app does not expose plain-text passwords in the database or UI.

## Manual Verification

A user can verify the app by doing the following:

1. Register a new user
2. Log in successfully
3. Refresh the page and confirm that the dashboard remains available
4. Log out and confirm the user is redirected to the auth screen
5. Update profile info
6. Request and confirm a password reset
7. Use the app with the new password and ensure the old password no longer works

## Defense Note

For the lab defense, a database inspector tool such as SQLite Browser or an extension that can read the SQLite file should be installed and ready to view the `users` table without exposing plain-text passwords. The password field will appear as a hashed value rather than raw user input.

