import sqlite3
from flask import Flask, render_template, g
DATABASE = 'path/to/database.db'


app = Flask(__name__)
db = sqlite3.connect('DATABASE')

cursor = db.cursor()

@app.route("/")
def home():
    return render_template("index.html")
