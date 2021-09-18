import enum
from flask_sqlalchemy import SQLAlchemy
from flask_bcrypt import Bcrypt
from sqlalchemy.orm import backref
from utils import generate_access_key
from datetime import datetime

db = SQLAlchemy()
bcrypt = Bcrypt()

class EntryType(enum.Enum):
    link = 1
    text_box = 2
    divider = 3

    @classmethod
    def type_to_string(cls, type):
        if type == cls.link:
            return 'link'
        elif type == cls.text_box:
            return 'text_box'
        elif type == cls.divider:
            return 'divider'
        else:
            raise TypeError

class Repo(db.Model):
    __tablename__ = 'repos'
    ## Columns
    access_key = db.Column(db.Text, primary_key=True)
    pass_phrase = db.Column(db.Text, nullable=False)
    title = db.Column(db.String(50))
    description = db.Column(db.String(300))
    is_private = db.Column(db.Boolean, nullable=False, default=False)
    last_visited = db.Column(db.Date, nullable=False, default=datetime.now)

    ## Relationships
    entries = db.relationship('Entry', backref='repo', cascade='delete')

    @classmethod
    def create(cls, pass_phrase, title=None, description=None, is_private=None):
        hashed_pw = bcrypt.generate_password_hash(pass_phrase).decode('utf-8')
        access_key = generate_access_key()
        return cls(title=title, description=description, pass_phrase=hashed_pw, access_key=access_key, is_private=is_private)
    
    @classmethod
    def authenticate(cls, access_key, pass_phrase):
        repo = cls.query.get(access_key)
        return repo and bcrypt.check_password_hash(repo.pass_phrase, pass_phrase)
    
    def update_last_visited(self):
        self.last_visited = datetime.now()
        db.session.commit()

    def to_json(self):
        entries = []
        for entry in self.entries:
            entries.append(entry.to_json())

        return {
            "access_key" : self.access_key,
            "title" : self.title,
            "description" : self.description,
            "is_private" : self.is_private,
            "last_visited" : str(self.last_visited),
            "entries" : entries
        }


class Entry(db.Model):
    __tablename__ = 'entries'
    ## Columns
    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    title = db.Column(db.Text, nullable=False)
    description = db.Column(db.Text)
    image = db.Column(db.Text)
    url = db.Column(db.Text)
    type = db.Column(db.Enum(EntryType), nullable=False, default='link')
    rating = db.Column(db.Integer)
    sequence = db.Column(db.Integer)
    repo_access_key = db.Column(db.Text, db.ForeignKey('repos.access_key', ondelete="CASCADE"), nullable=False)

    type_to_string = {
        EntryType.link : 'link',
        EntryType.divider : 'divider',
        EntryType.text_box : 'text_box'
    }

    def to_json(self):
        return {
            "id" : self.id,
            "title" : self.title,
            "description" : self.description,
            "image" : self.image,
            "url" : self.url,
            "type" : Entry.type_to_string[self.type],
            "rating" : self.rating,
            "sequence" : self.sequence,
        }

def connect_db(flask_app):
    """Connects database to Flask app, import and call in app.py"""
    db.app = flask_app
    db.init_app(flask_app)