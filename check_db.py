import sqlite3
import app

conn = sqlite3.connect(app.DATABASE)

cursor = conn.cursor()

cursor.execute('SELECT * FROM tasks')
rows = cursor.fetchall()

for row in rows:
    print(rows)

conn.close()