import os
from unittest import TestCase
from sqlalchemy.exc import IntegrityError, DataError
from models import db, Entry, Repo
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

        # title must be < 100 chars
        new_repo = Repo(access_key="blah", pass_phrase="pw", title=("x" * 101))
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