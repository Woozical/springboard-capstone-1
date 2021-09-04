import os
from flask import Flask, render_template, request, redirect, url_for
from models import db, connect_db, Repo, Entry
from forms import NewRepoForm
from scrape import get_tags

app = Flask(__name__)

app.config['SECRET_KEY'] = (
    os.environ.get('FLASK_KEY', 'SECRET_KEY_DEV')
)

app.config['SQLALCHEMY_DATABASE_URI'] = (
    os.environ.get('DATABASE_URI', 'postgresql:///link-repo')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = False

connect_db(app)
db.create_all()

@app.route('/')
def home_view():
    return render_template('home.html')

@app.route('/repo/<access_key>')
def repo_view(access_key):
    repo = Repo.query.get_or_404(access_key)
    return render_template('repo.html', repo=repo)

@app.route('/repo/create', methods=['GET', 'POST'])
def repo_create():
    form = NewRepoForm()
    if form.validate_on_submit():
        new_repo = Repo.create(
            pass_phrase = form.pass_phrase.data,
            title = form.title.data,
            description = form.description.data,
            is_private = form.is_private.data
        )
        db.session.add(new_repo)
        db.session.commit()
        return redirect(
            url_for('repo_view', access_key=new_repo.access_key)
        )
    else:
        return render_template('repo-create.html', form=form)