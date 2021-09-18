import os
from unittest import TestCase
from sqlalchemy.exc import IntegrityError, DataError
from models import db, Entry, Repo, EntryType
from datetime import datetime

# Set db to testing db prior to app import
os.environ['DATABASE_URI'] = "postgresql:///link-test"

from app import app

db.drop_all()
db.create_all()

class RepoModelTestCase(TestCase):
    def setUp(self):
        # Clean old data
        Entry.query.delete()
        Repo.query.delete()

        # New sample data
        repo = Repo(access_key='123abc', pass_phrase='password', title='Test Repo', description='Test Desc')
        db.session.add(repo)
        db.session.commit()
    
    def tearDown(self):
        # Clean failed transactions
        db.session.rollback()
    
    def test_defaults(self):
        """Repo's is_private and last_visited fields should default to False and creation time, respectively"""
        repo = Repo.query.get('123abc')
        today = datetime.now().date()
        self.assertEqual(repo.is_private, False)
        self.assertEqual(repo.last_visited, today)

    def test_constraints(self):
        """Two or more repos should not have the same access key.
        A repo must have a passphrase and access key.
        A repo's title must be 100 characters or less.
        A repo's description must be 300 characters or less."""
        
        # access key as PK, must be unique
        new_repo = Repo(access_key="aaa", pass_phrase="pw")
        db.session.add(new_repo)
        db.session.commit()

        get_repo = Repo.query.get('aaa')
        self.assertEqual(new_repo, get_repo)

        new_repo = Repo(access_key='123abc', pass_phrase='pw')
        with self.assertRaises(IntegrityError):
            db.session.add(new_repo)
            db.session.commit()
        db.session.rollback()
        
        # must have pw
        new_repo = Repo(access_key='blahblah')
        with self.assertRaises(IntegrityError):
            db.session.add(new_repo)
            db.session.commit()
        db.session.rollback()

        # title must be < 50 chars
        new_repo = Repo(access_key="blah", pass_phrase="pw", title=("x" * 51))
        with self.assertRaises(DataError):
            db.session.add(new_repo)
            db.session.commit()
        db.session.rollback()

        # desc must be < 300 chars
        new_repo = Repo(access_key="blah", pass_phrase="pw", description=("x" * 301))
        with self.assertRaises(DataError):
            db.session.add(new_repo)
            db.session.commit()
        db.session.rollback()
    
    def test_create_method(self):
        """Create method must make unique access key, and hashed and salted pw"""
        today = datetime.now().date()
        repo1 = Repo.create(pass_phrase='123abc', title='title a', description='description b', is_private=True)
        repo2 = Repo.create(pass_phrase='123abc')

        db.session.add_all([repo1, repo2])
        db.session.commit()

        self.assertNotEqual(repo1.pass_phrase, '123abc') #hashed
        self.assertNotEqual(repo1.pass_phrase, repo2.pass_phrase) #salted
        self.assertNotEqual(repo1.access_key, repo2.access_key) #unique keys

        # passed fields must carry to db entry
        self.assertEqual(repo1.title, 'title a')
        self.assertEqual(repo1.description, 'description b')
        self.assertEqual(repo1.is_private, True)
        # Instantiated with defaults where applicable
        self.assertEqual(repo2.is_private, False)
        self.assertIsNotNone(repo2.is_private)
        self.assertEqual(repo1.last_visited, today)
        self.assertEqual(repo2.last_visited, today)
    
    def test_auth_method(self):
        """Authenticate method must return true if plaintext passphrase matches hashed passphrase"""

        repo = Repo.create(pass_phrase='pw')
        db.session.add(repo)
        db.session.commit()

        key = repo.access_key
        
        ### Current ver. of Flask_bcrypt uses a deprecated string comparison method
        import warnings
        warnings.filterwarnings("ignore", category=DeprecationWarning) 
        ###

        self.assertTrue(Repo.authenticate(key, 'pw')) # plaintext == hash
        self.assertFalse(Repo.authenticate(key, 'pW')) # case sensitive

        self.assertFalse(Repo.authenticate('hjs09rjthsg', 'pw')) # return false on non-existant repo
        self.assertFalse(Repo.authenticate(key, repo.pass_phrase)) # should not authenticate on passing in hash
    
    def test_json_serialize(self):
        """JSON method must return a python dictionary containing repo info"""

        repo = Repo.query.get('123abc')
        repo_json = repo.to_json()

        # Password hash must NOT be returned in json
        self.assertFalse(repo.pass_phrase in repo_json.values())

        self.assertEqual(repo.access_key, repo_json['access_key'])
        self.assertEqual(repo.title, repo_json['title'])
        self.assertEqual(repo.description, repo_json['description'])
        self.assertEqual(str(repo.last_visited), repo_json['last_visited'])
        self.assertEqual(len(repo.entries), len(repo_json['entries']))

class EntryModelTestCase(TestCase):
    def setUp(self):
        # Clean old data
        Entry.query.delete()
        Repo.query.delete()

        # New sample data
        repo = Repo(access_key='123abc', pass_phrase='password', title='Test Repo', description='Test Desc')
        db.session.add(repo)
        db.session.commit()

        entry = Entry(title="entry title", repo_access_key="123abc")
        db.session.add(entry)
        db.session.commit()

        self.entry_id = entry.id
    
    def tearDown(self):
        # Clean failed transactions
        db.session.rollback()
    
    def test_fields(self):
        # Entry Type defaults to 'link'
        self.assertEqual(
            Entry.query.get(self.entry_id).type, EntryType.link
        )

        # Entry Type must be 'link', 'text_box', or 'divider'
        with self.assertRaises(DataError):
            new_entry = Entry(title="new title", type="flargenstow", repo_access_key="123abc")
            db.session.add(new_entry)
            db.session.commit()
        
        db.session.rollback()
        
        # repo_access_key must not be null
        with self.assertRaises(IntegrityError):
            new_entry = Entry(title="new title")
            db.session.add(new_entry)
            db.session.commit()
        
    def test_enum_toStr(self):
        """Ensure the enum to string dictionary on Entry class works"""
        entry = Entry.query.get(self.entry_id)
        self.assertEqual(
            Entry.type_to_string[entry.type], 'link'
        )

        entry.type = EntryType.text_box
        self.assertEqual(
            Entry.type_to_string[entry.type], 'text_box'
        )

        entry.type = EntryType.divider
        self.assertEqual(
            Entry.type_to_string[entry.type], 'divider'
        )
    
    def test_json_serialize(self):
        entry = Entry.query.get(self.entry_id)
        entry_json = entry.to_json()

        self.assertEqual(entry.id, entry_json['id'])
        self.assertEqual(entry.title, entry_json['title'])
        self.assertEqual(entry.description, entry_json['description'])
        self.assertEqual(entry.image, entry_json['image'])
        self.assertEqual(entry.url, entry_json['url'])
        self.assertEqual(entry.rating, entry_json['rating'])
        self.assertEqual(entry.sequence, entry_json['sequence'])

        self.assertEqual(
            Entry.type_to_string[entry.type], entry_json['type']
        )


