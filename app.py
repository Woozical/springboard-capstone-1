import os
from flask import Flask, render_template, request, redirect
from models import db, connect_db
from scrape import get_tags

app = Flask(__name__)

app.config['SQLALCHEMY_DATABASE_URI'] = (
    os.environ.get('DATABASE_URI', 'postgresql:///link-repo')
)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = False

connect_db(app)
db.create_all()

@app.route('/')
def home_view():
    return render_template('base.html')