import os
from flask import Flask, session, render_template, request, redirect, url_for, jsonify
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

## Front-end Layer

@app.route('/')
def home_view():
    return render_template('home.html')

@app.route('/repo/<access_key>')
def repo_view(access_key):
    repo = Repo.query.get_or_404(access_key)
    return render_template('repo.html', repo=repo)

@app.route('/repo/create', methods=['GET', 'POST'])
def repo_create():
    # TO DO: This should only return the HTML on json requests
    # (To prevent users from navigating directly to /repo/create)
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
        return render_template('/forms/create-repo.html', form=form)


### API Layer ###
@app.route('/api/repo/<access_key>', methods=['GET'])
def api_repo_get(access_key):
    repo = Repo.query.get(access_key)
    if not repo:
        return jsonify(error="Repo not found"), 404
    if not repo.is_private or ('working_repo' in session and session['working_repo'] == repo.access_key):
        return jsonify(repo.to_json())
    else:
        return jsonify(error="Unauthorized"), 401

@app.route('/api/<access_key>/auth', methods=['POST'])
def api_repo_auth(access_key):
    repo = Repo.query.get(access_key)
    data = request.get_json()
    if not repo:
        return jsonify(error="Repo not found"), 404

    if not request.is_json:
        return jsonify(error="Bad request, payload must be JSON"), 400

    # Authorize
    if "pass_phrase" not in data:
        return jsonify(error="Field 'pass_phrase' required for DELETE operation."), 400
    elif not Repo.authenticate(access_key, data['pass_phrase']):
        return jsonify(error="Unauthorized"), 401
    else:
        session['working_repo'] = access_key
        return jsonify(message='success')

@app.route('/api/repo/<access_key>', methods=['DELETE'])
def api_repo_delete(access_key):
    repo = Repo.query.get(access_key)
    data = request.get_json()
    ### TO DO: Make a function to handle json playod for 404, json validation, and auth
    
    if not repo:
        return jsonify(error="Repo not found"), 404
    
    if not request.is_json:
        return jsonify(error="Bad request, payload must be JSON"), 400

    # Authorize
    if "pass_phrase" not in data:
        return jsonify(error="Field 'pass_phrase' required for DELETE operation."), 400
    elif not Repo.authenticate(access_key, data['pass_phrase']):
        return jsonify(error="Unauthorized"), 401
    
    db.session.delete(repo)
    db.session.commit()
    return jsonify(message=f"success. {access_key} deleted.")

@app.route('/api/repo/<access_key>', methods=['PATCH'])
def api_repo_patch(access_key):
    repo = Repo.query.get(access_key)
    data = request.get_json()
    errors = {}

    if not repo:
        return jsonify(error="Repo not found"), 404

    if not request.is_json:
        return jsonify(error="Bad request, payload must be JSON"), 400

    # Authorize
    if "pass_phrase" not in data:
        return jsonify(error="Field 'pass_phrase' required for PATCH operation."), 400
    elif not Repo.authenticate(access_key, data['pass_phrase']):
        return jsonify(error="Unauthorized"), 401
    
    # Update
    if 'is_private' in data:
        if isinstance(data['is_private'], bool):
            repo.is_private = data['is_private']
        else:
            errors['is_private'] = 'Must be of type boolean.'
    
    if 'title' in data:
        if not isinstance(data['title'], str):
            errors['title'] = 'Must be of type string. '
        elif len(data['title']) > 100:
            err = errors.get('title', '')
            err = err + 'Must be 100 characters or less'
            errors['title'] = err
        else:
            repo.title = data['title']
    
    if 'description' in data:
        if not isinstance(data['description'], str):
            errors['description'] = 'Must be of type string. '
        elif len(data['description']) > 100:
            err = errors.get('description', '')
            err = err + 'Must be 300 characters or less'
            errors['description'] = err
        else:
            repo.description = data['description']
    
    # Abort if errors in request
    if len(errors.keys()) > 0:
        db.session.rollback()
        return jsonify(errors=errors), 400
    else:
        repo.update_last_visited()
        db.session.commit()
        return jsonify(message='success', repo=repo.to_json())