import os
from flask import Flask, session, render_template, request, redirect, url_for, jsonify, flash
from models import db, connect_db, Repo, Entry
from forms import AuthRepoForm, NewRepoForm
from scrape import get_tags
from datetime import timedelta

app = Flask(__name__)

app.config['SECRET_KEY'] = (
    os.environ.get('FLASK_KEY', 'SECRET_KEY_DEV')
)

app.config['SQLALCHEMY_DATABASE_URI'] = (
    os.environ.get('DATABASE_URI', 'postgresql:///link-repo')
)
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['SQLALCHEMY_ECHO'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(days=7)

connect_db(app)
db.create_all()

@app.before_request
def before_request_func():
    if 'SameSite' not in session:
        session['SameSite'] = 'Strict'

@app.errorhandler(404)
def not_found_view(e):
    return render_template('not-found.html')

## Front-end Layer
@app.route('/')
def home_view():
    form = NewRepoForm()
    sAuth = 'working_repo' in session
    sView = 'last_viewed' in session

    if sAuth and sView:
        if session['working_repo'] == session['last_viewed']:
            last_edited = last_viewed = Repo.query.get(session['last_viewed'])
        else:
            last_edited = Repo.query.get(session['working_repo'])
            last_viewed = Repo.query.get(session['last_viewed'])
    else:
        last_edited = Repo.query.get(session['working_repo']) if sAuth else None
        last_viewed = Repo.query.get(session['last_viewed']) if sView else None

    return render_template('home.html', form=form, last_edited=last_edited, last_viewed=last_viewed)

@app.route('/repo/<access_key>')
def repo_view(access_key):
    repo = Repo.query.get_or_404(access_key)
    if repo.is_private and ('working_repo' not in session or session['working_repo'] != access_key):
        return redirect(url_for('repo_auth', access_key=access_key))
    else:
        repo.update_last_visited()
        session['last_viewed'] = repo.access_key
        return render_template('repo.html', repo=repo)

@app.route('/repo/auth', methods=['GET', 'POST'])
def repo_auth():
    """Brings up auth page for a repo (for private viewing / editing priviledges)"""
    form = AuthRepoForm()
    repo = Repo.query.get_or_404(request.args.get('access_key'))

    if session.get('working_repo') == repo.access_key:
        return redirect(url_for('repo_view', access_key=repo.access_key))

    if form.validate_on_submit():
        if Repo.authenticate(repo.access_key, form.pass_phrase.data):
            session['working_repo'] = repo.access_key
            session.permanent = True
            return redirect(url_for('repo_view', access_key=repo.access_key))
        else:
            flash('Wrong password')
        
    return render_template('auth.html', form=form)


### API Layer ###

@app.route('/api/scrape')
def api_scrape_url():
    # TO-DO: Implement opengraphr API to plug metadata gaps
    if 'working_repo' in session:
        meta_data = get_tags(request.args['url'])
        return jsonify(msg="success", data=meta_data)
    else:
        return jsonify(msg="failure, unauthorized"), 401

@app.route('/api/repo/create', methods=['POST'])
def api_repo_create():
    form = NewRepoForm()
    if form.validate_on_submit():
        # On the miniscule chance we generate a non-unique access key, loop and try again.
        success = False
        while not success:
            new_repo = Repo.create(
                pass_phrase = form.pass_phrase.data,
                title = form.title.data,
                description = form.description.data,
                is_private = form.is_private.data
            )
            db.session.add(new_repo)
            try:
                db.session.commit()
                success = True
            except:
                db.session.rollback()
                success = False
        session['working_repo'] = new_repo.access_key
        return jsonify(message='success', created=new_repo.access_key)
    else:
        return jsonify(message="failed", errors=form.errors_to_json()), 400


@app.route('/api/repo/<access_key>', methods=['GET'])
def api_repo_get(access_key):
    repo = Repo.query.get(access_key)
    if not repo:
        return jsonify(error="Repo not found"), 404
    if not repo.is_private or ('working_repo' in session and session['working_repo'] == repo.access_key):
        return jsonify(repo.to_json())
    else:
        return jsonify(error="Unauthorized"), 401

@app.route('/api/repo/auth', methods=['POST'])
def api_repo_auth():
    data = request.get_json()

    if not request.is_json:
        return jsonify(error="Bad request, payload must be JSON"), 400

    # Authorize
    if "access_key" not in data:
        return jsonify(error="Field 'access_key' required for operation."), 400
    elif "pass_phrase" not in data:
        return jsonify(error="Field 'pass_phrase' required for operation."), 400
    elif not Repo.authenticate(data['access_key'], data['pass_phrase']):
        return jsonify(error="Unauthorized"), 401
    else:
        session['working_repo'] = data['access_key']
        return jsonify(message='success')

@app.route('/api/repo/<access_key>', methods=['DELETE'])
def api_repo_delete(access_key):
    repo = Repo.query.get(access_key)
    data = request.get_json()
    ### TO DO: Make a function to handle json payload for 404, json validation, and auth
    
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
    del session['working_repo']
    return jsonify(message=f"success. {access_key} deleted."), 200

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
    if "working_repo" not in session:
        return jsonify(error="Unauthorized"), 401
    if session['working_repo'] != access_key:
        return jsonify(error="Unauthorized"), 403
    
    # Update
    if 'is_private' in data:
        if isinstance(data['is_private'], bool):
            repo.is_private = data['is_private']
        else:
            errors['is_private'] = 'Must be of type boolean.'
    
    if 'title' in data:
        if not isinstance(data['title'], str):
            errors['title'] = 'Must be of type string. '
        elif len(data['title']) > 50:
            err = errors.get('title', '')
            err = err + 'Must be 50 characters or less'
            errors['title'] = err
        else:
            repo.title = data['title']
    
    if 'description' in data:
        if not isinstance(data['description'], str):
            errors['description'] = 'Must be of type string. '
        elif len(data['description']) > 300:
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
        db.session.commit()
        return jsonify(message='success', repo=repo.to_json())

@app.route('/api/repo/<access_key>/entries/new', methods=['POST'])
def api_repo_new_entries(access_key):
    """Accepts a JSON payload, which contains a field 'new', which is an array/list of objects with data for new entries"""
    repo = Repo.query.get(access_key)
    if not repo:
        return jsonify(error="Repo not found"), 404
    
    if not request.is_json:
        return jsonify(error="Bad request, payload must be JSON"), 400
    # Authorize
    if not 'working_repo' in session:
        return jsonify(error="Operation requires authentication"), 401
    if session['working_repo'] != access_key:
        return jsonify(error="Not authorized for this operation"), 403
    
    data = request.get_json()
    new_entries = []
    try:
        for entry in data['new']:
            new_entries.append(
                Entry(
                    title=entry['title'], description=entry.get('description'),
                    image=entry.get('image'), url=entry.get('url'),
                    type=entry['type'], rating=entry.get('rating'),
                    sequence=entry.get('sequence'), repo_access_key=access_key
                )
            )
    except KeyError as err:
        return jsonify(error=f"Missing field: {err.args[0]}"), 400
    
    db.session.add_all(new_entries)
    db.session.commit()
    return jsonify(msg=f"Success. Created {len(new_entries)} on {access_key}"), 201


@app.route('/api/repo/<access_key>/entries', methods=['PATCH'])
def api_entries_patch(access_key):
    """Accepts a JSON payload, which contains a field 'change', which is an array/list of objects
    with data for updating existing entries"""
    repo = Repo.query.get(access_key)
    if not repo:
        return jsonify(error="Repo not found"), 404
    
    if not request.is_json:
        return jsonify(error="Bad request, payload must be JSON"), 400
    
    data = request.get_json()
    # Authorize
    if not 'working_repo' in session:
        return jsonify(error="Operation requires authentication"), 401
    if session['working_repo'] != access_key:
        return jsonify(error="Not authorized for this operation"), 403
    try:
        for entry in data['change']:
            db_entry = Entry.query.get(entry['id'])
            if not db_entry:
                return jsonify(error=f"Entry id:{entry['id']} is invalid."), 400
            if db_entry.repo_access_key != access_key:
                return jsonify(error=f"Entry with id:{entry['id']} does not belong to repo {access_key}"), 403
            db_entry.title = entry.get('title', db_entry.title)
            db_entry.description = entry.get('description', db_entry.description)
            db_entry.image = entry.get('image', db_entry.image)
            db_entry.url = entry.get('url', db_entry.url)
            db_entry.type = entry.get('type', db_entry.type)
            db_entry.rating = entry.get('rating', db_entry.rating)
            db_entry.sequence = entry.get('sequence', db_entry.sequence)
    except KeyError as err:
        return jsonify(error=f"Missing field: {err.args[0]}"), 400
    
    db.session.commit()
    return jsonify(msg=f"Success. Updated {len(data['change'])} on {access_key}")

@app.route('/api/repo/<access_key>/entries', methods=['DELETE'])
def api_entries_deletion(access_key):
    repo = Repo.query.get(access_key)
    if not repo:
        return jsonify(error="Repo not found"), 404
    
    if not request.is_json:
        return jsonify(error="Bad request, payload must be JSON"), 400
    #Authorize
    if not 'working_repo' in session:
        return jsonify(error="Operation requires authentication"), 401
    if session['working_repo'] != access_key:
        return jsonify(error="Not authorized for this operation"), 403
    
    data = request.get_json()
    try:
        for id in data['delete']:
            entry = Entry.query.get(id)
            if not entry:
                return jsonify(error=f"Entry id:{id} is invalid."), 400
            if entry.repo_access_key != access_key:
                return jsonify(error=f"Entry with id:{id} does not belong to repo {access_key}"), 403
            
            db.session.delete(entry)
    except KeyError as err:
        return jsonify(error=err.message), 400
    
    db.session.commit()
    return jsonify(msg=f"Success. Deleted {len(data['delete'])} on {access_key}")
