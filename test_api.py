import os
from unittest import TestCase
from models import db, Entry, Repo
from flask import session

# Set db to testing db prior to app import
os.environ['DATABASE_URI'] = "postgresql:///link-test"

from app import app

db.drop_all()
db.create_all()

class APITestCase(TestCase):
    def setUp(self):
        # Clean old data
        Entry.query.delete()
        Repo.query.delete()

        # New sample data
        repo = Repo(access_key='123abc', pass_phrase='password', title='Test Repo', description='Test Desc')
        p_repo = Repo(access_key='private123', pass_phrase='pw123', title='Private Repo', description='Private Desc', is_private=True)
        db.session.add_all([repo, p_repo])
        db.session.commit()

        entry = Entry(title="entry title", description="entry desc", image="image.jpg", url="http://url.com", repo_access_key="123abc")
        private_entry = Entry(title='private title', repo_access_key='private123')
        db.session.add_all([entry, private_entry])
        db.session.commit()

        self.entry_id = entry.id
        self.p_entry_id = private_entry.id
    
    def tearDown(self):
        # Clean failed transactions
        db.session.rollback()
    
    def test_repo_get(self):
        """ GET of a public repo """
        with app.test_client() as client:
            ### Not Found ###
            res = client.get('/api/repo/oiaehoaio028tj348tj3')
            self.assertEqual(res.status_code, 404)
            
            endpoint = '/api/repo/123abc'
            res = client.get(endpoint)

            self.assertEqual(res.status_code, 200)
            json = res.get_json()

            repo = Repo.query.get('123abc')
            entry = Entry.query.get(self.entry_id)

            # Should return JSON data matching repo's data
            self.assertEqual(json['title'], repo.title)
            self.assertEqual(json['description'], repo.description)
            self.assertEqual(json['last_visited'], str(repo.last_visited))
            self.assertEqual(json['is_private'], repo.is_private)

            # Repo's pw hash should not be present
            self.assertNotIn(repo.pass_phrase, json.values())
            self.assertNotIn(repo.pass_phrase, json)

            # Should return JSON data for the repo's entries
            self.assertEqual(json['entries'][0]['title'], entry.title)
            self.assertEqual(json['entries'][0]['description'], entry.description)
            self.assertEqual(json['entries'][0]['image'], entry.image)
            self.assertEqual(json['entries'][0]['url'], entry.url)
    
    def test_repo_private_get(self):
        """ GET of a private repo """
        with app.test_client() as client:
            endpoint = '/api/repo/private123'

            ### Unauthenticated ###
            res = client.get(endpoint)
            self.assertEqual(res.status_code, 401)

            json_text = res.get_data(as_text=True)
            repo = Repo.query.get('private123')
            entry = Entry.query.get(self.p_entry_id)

            # Should not return any JSON data regarding repo or its entries
            self.assertNotIn(repo.title, json_text)
            self.assertNotIn(repo.description, json_text)
            self.assertNotIn(str(repo.last_visited), json_text)
            self.assertNotIn(str(repo.is_private), json_text)
            self.assertNotIn(repo.pass_phrase, json_text)
            
            self.assertNotIn(entry.title, json_text)
            self.assertNotIn(entry.repo_access_key, json_text)

            ### Unauthorized ###
            with client.session_transaction() as sess:
                sess['working_repo'] = '123abc'
            
            res = client.get(endpoint)
            self.assertEqual(res.status_code, 403)
            
            ### Authorized ###
            with client.session_transaction() as sess:
                sess['working_repo'] = 'private123'
            
            res = client.get(endpoint)
            self.assertEqual(res.status_code, 200)
    
    def test_repo_delete(self):
        """ DELETE of a repo """
        with app.test_client() as client:
            repo = Repo.create(pass_phrase='password')
            db.session.add(repo)
            db.session.commit()
            key = repo.access_key
            endpoint = f"/api/repo/{key}"

            with client.session_transaction() as sess:
                sess['working_repo'] = key

            ### Not Found ###
            res = client.delete('/api/repo/oiaehoaio028tj348tj3')
            self.assertEqual(res.status_code, 404)

            # DELETE request requires the repo's password in payload
            res = client.delete(endpoint)
            self.assertEqual(res.status_code, 400)

            # Incorrect password
            res = client.delete(endpoint, json={'pass_phrase' : 'Password'})
            self.assertEqual(res.status_code, 401)

            # Does not accept PW hash
            res = client.delete(endpoint, json={'pass_phrase' : repo.pass_phrase})
            self.assertEqual(res.status_code, 401)

            # Success
            res = client.delete(endpoint, json={'pass_phrase' : 'password'})
            self.assertEqual(res.status_code, 200)
            self.assertIsNone(Repo.query.get(key))
            self.assertNotIn('working_repo', session)
            self.assertNotIn(key, session.values())
    
    def test_repo_patch(self):
        """ PATCH of a repo """
        with app.test_client() as client:

            ### Not Found ###
            res = client.patch('/api/repo/oiaehoaio028tj348tj3')
            self.assertEqual(res.status_code, 404)

            endpoint = f"/api/repo/123abc"
            repo = Repo.query.get('123abc')
           
            ### Unauthenticated ###
            res = client.patch(endpoint, json={'title' : 'New Title'})
            self.assertEqual(res.status_code, 401)
            self.assertNotEqual(repo.title, 'New Title')
           
            ### Unauthorized ###
            with client.session_transaction() as sess:
                sess['working_repo'] = 'private123'
            
            res = client.patch(endpoint, json={'title' : 'New Title'})
            self.assertEqual(res.status_code, 403)
            self.assertNotEqual(repo.title, 'New Title')
           
            ### No data ###
            with client.session_transaction() as sess:
                sess['working_repo'] = '123abc'
            
            res = client.patch(endpoint)
            self.assertEqual(res.status_code, 400)

            ### Bad data ###
            res = client.patch(endpoint, json={'title' : 5000})
            self.assertEqual(res.status_code, 400)

            res = client.patch(endpoint, json={'title' : ('x'*100)})
            self.assertEqual(res.status_code, 400)

            ### Success ###
            res = client.patch(endpoint, json={'title' : 'New Title'})
            self.assertEqual(res.status_code, 200)
            repo = Repo.query.get('123abc')
            self.assertEqual(repo.title, 'New Title')
    
    def test_create_entries(self):
        """ POST request to create new entries for a repo """
        with app.test_client() as client:
            ### Not Found ###
            res = client.post('/api/repo/290jt3irgodifbmfbdxmgboidn/entries/new')
            self.assertEqual(res.status_code, 404)

            endpoint = f"/api/repo/123abc/entries/new"
            data = {
                'new' : [
                    {'title' : 'asdf title','description' : 'asdf description', 'type' : 'link'},
                    {'title' : 'zxcv title','description' : 'zcxv description', 'image' : 'zxcv.jpg', 'type': 'link'}
                ]
            }

            bad_data = {
                'new' : [
                    {'title' : 500, 'type' : 'flargen'}
                ]
            }
           
            ### Unauthenticated ###
            res = client.post(endpoint, json=data)
            self.assertEqual(res.status_code, 401)
           
            ### Unauthorized ###
            with client.session_transaction() as sess:
                sess['working_repo'] = 'private123'
            
            res = client.post(endpoint, json=data)
            self.assertEqual(res.status_code, 403)

            with client.session_transaction() as sess:
                sess['working_repo'] = '123abc'
            
            ### No Data ###
            res = client.post(endpoint, json={})
            self.assertEqual(res.status_code, 400)

            ### Missing Data ###
            res = client.post(endpoint, json={'new': [{'title' : 'yes'}]})
            self.assertEqual(res.status_code, 400)
            res = client.post(endpoint, json={'new' : [{'title' : 'yes', 'type' : 'link'}, {'type' : 'divider'}]})
            self.assertEqual(res.status_code, 400)

            ### Bad Data ###
            res = client.post(endpoint, json=bad_data)
            self.assertEqual(res.status_code, 400)
            repo = Repo.query.get('123abc')
            self.assertEqual(len(repo.entries), 1)

            ### Success ###
            res = client.post(endpoint, json=data)
            self.assertEqual(res.status_code, 201)
            repo = Repo.query.get('123abc')
            self.assertEqual(len(repo.entries), 3)

    def test_create_entries(self):
        """ PATCH request to update existing entries for a repo """
        with app.test_client() as client:
            ### Not Found ###
            res = client.patch('/api/repo/290jt3irgodifbmfbdxmgboidn/entries')
            self.assertEqual(res.status_code, 404)

            endpoint = f"/api/repo/123abc/entries"
            data = {
                'change' : [
                    {'id' : self.entry_id, 'title' : 'asdf title','description' : 'asdf description', 'type' : 'link'},
                ]
            }

            bad_data = {
                'change' : [
                    {'id' : self.entry_id, 'title' : 500, 'type' : 'flargen'}
                ]
            }
           
            ### Unauthenticated ###
            res = client.patch(endpoint, json=data)
            self.assertEqual(res.status_code, 401)
           
            ### Unauthorized ###
            with client.session_transaction() as sess:
                sess['working_repo'] = 'private123'
            
            res = client.patch(endpoint, json=data)
            self.assertEqual(res.status_code, 403)

            with client.session_transaction() as sess:
                sess['working_repo'] = '123abc'
            
            ### No Data ###
            res = client.patch(endpoint, json={})
            self.assertEqual(res.status_code, 400)

            ### Missing Data ###
            res = client.patch(endpoint, json={'change': [{'title' : 'yes'}]})
            self.assertEqual(res.status_code, 400)

            ### Bad Data ###
            # Attempting to change an entry that doesn't exist
            res = client.patch(endpoint, json={'change': [{'id' : -1, 'title' : 'yes'}]})
            self.assertEqual(res.status_code, 400)
           
            # Attempting to change another repo's entry
            res = client.patch(endpoint, json={'change' : [{'id': self.p_entry_id, 'title': 'yes'}]})
            self.assertEqual(res.status_code, 403)
            entry = Entry.query.get(self.p_entry_id)
            self.assertNotEqual(entry.title, 'yes')
           
            # Attempting to change an entry's fields to invalid data
            res = client.patch(endpoint, json=bad_data)
            self.assertEqual(res.status_code, 400)
            entry = Entry.query.get(self.entry_id)
            self.assertEqual(entry.title, 'entry title')

            ### Success ###
            res = client.patch(endpoint, json=data)
            self.assertEqual(res.status_code, 200)
            entry = Entry.query.get(self.entry_id)
            self.assertEqual(entry.title, 'asdf title')

    def test_delete_entries(self):
        """ DELETE request to delete existing entries for a repo """
        with app.test_client() as client:
            ### Not Found ###
            res = client.delete('/api/repo/290jt3irgodifbmfbdxmgboidn/entries')
            self.assertEqual(res.status_code, 404)

            endpoint = f"/api/repo/123abc/entries"
           
            ### Unauthenticated ###
            res = client.delete(endpoint, json={'delete' : [self.entry_id]})
            self.assertEqual(res.status_code, 401)
           
            ### Unauthorized ###
            with client.session_transaction() as sess:
                sess['working_repo'] = 'private123'
            
            res = client.delete(endpoint, json={'delete' : [self.entry_id]})
            self.assertEqual(res.status_code, 403)
            self.assertIsNotNone(Entry.query.get(self.entry_id))
            self.assertEqual(len(Repo.query.get('123abc').entries), 1)
            with client.session_transaction() as sess:
                sess['working_repo'] = '123abc'
            
            ### No Data ###
            res = client.delete(endpoint, json={})
            self.assertEqual(res.status_code, 400)

            ### Bad Data ###
            # Attempting to delete an entry that doesn't exist
            res = client.delete(endpoint, json={'delete' : [-1]})
            self.assertEqual(res.status_code, 400)

            # Attempting to delete another repo's entry
            res = client.delete(endpoint, json={'delete' : [self.p_entry_id]})
            self.assertEqual(res.status_code, 403)
            self.assertIsNotNone(Entry.query.get(self.p_entry_id))

            ### Success ###
            res = client.delete(endpoint, json={'delete' : [self.entry_id]})
            self.assertEqual(res.status_code, 200)
            self.assertIsNone(Entry.query.get(self.entry_id))
            self.assertEqual(len(Repo.query.get('123abc').entries), 0)