import enum
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from utils import generate_access_key

db = SQLAlchemy()
bcrypt = Bcrypt()

class EntryType(enum.Enum):
    link = 1
    text_box = 2
    divider = 3

class Repo(db.Model):
    __tablename__ = 'repos'
    ## Columns
    access_key = db.Column(db.Text, primary_key=True)
    pass_phrase = db.Column(db.Text, nullable=False)
    title = db.Column(db.String(100))
    description = db.Column(db.String(300))

    @classmethod
    def create(cls, pass_phrase, title=None, description=None):
        hashed_pw = bcrypt.generate_password_hash(pass_phrase).decode('utf-8')
        access_key = generate_access_key()
        return cls(title=title, description=description, pass_phrase=hashed_pw, access_key=access_key)
    
    @classmethod
    def authenticate(cls, access_key, pass_phrase):
        repo = cls.query.get(access_key)
        return repo and bcrypt.check_password_hash(repo.pass_phrase, pass_phrase)


class Entry(db.Model):
    __tablename__ = 'entries'
    ## Columns
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    url = db.Column(db.Text)
    entry_type = db.Column(db.Enum(EntryType), nullable=False, default='link')
    rating = db.Column(db.Integer)
    sequence = db.Column(db.Integer)
    repo_access_key = db.Column(db.Text, db.ForeignKey('repos.access_key', ondelete="CASCADE"), nullable=False)

def connect_db(flask_app):
    """Connects database to Flask app, import and call in app.py"""
    db.app = flask_app
    db.init_app(flask_app)