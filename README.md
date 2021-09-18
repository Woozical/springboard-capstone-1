# LinkBin
## Summary

LinkBin is an open-source web application that serves as a tool to create repositories of links, while also providing aesthetic and organizational features. It was developed as a capstone project for Springboard's software engineering bootcamp. This project was built in Python3 and ECMAScript using the following technologies:

* Web Framework: [Flask (version 2.0.1)](https://flask.palletsprojects.com/en/2.0.x/)
* RDBMS: [PostgreSQL](https://www.postgresql.org/)
* ORM: [SQLAlchemy](https://www.sqlalchemy.org/)
* Form Validaton: [WTForms](https://wtforms.readthedocs.io/en/2.3.x/)
* AJAX API: [Axios](https://github.com/axios/axios)
* Password Encryption: [Flask-Bcrypt](https://flask-bcrypt.readthedocs.io/en/latest/)
* CSS, Font Libaries: [Bootstrap 5](https://getbootstrap.com/)

And the related Flask/Python wrappers for the above tools. The full list of server dependencies can be found in `requirements.txt`.

The application makes use of OpenGraph metadata for styling links. Retrieval of this data is done using a homemade HTML parser and [OpenGraph.io's API](https://www.opengraph.io/) as a backup for when my tool fails. The landing page's animated gradient CSS was generated with the [CSS Gradient Animator](https://www.gradient-animator.com/) tool by Ian Forrest.


## Proposal
Many communities require a central location to link to their various resources, often pastebin is used. Or, they need to collate related links together (e.g. installation guides, wish lists, to do lists, bookmarks). This website will allow users to create and share repositories for their links without having to register accounts. In their repository, users can do things such as create dividers, enable website preview thumbnails, assign a rank to each entry, and automatically or manually order how their links are displayed.

## Schema

__Entries__

| id | title | description | image | url | type | rating | sequence | repo_access_key |
--- | --- | --- | --- | --- | --- | --- | --- | ---
| PK | Text | Text, Nullable | Text, Nullable | Text, Nullable | enum default='url' | Integer, Nullable | Integer, Nullable | Text FK(repo.access_key), OD=Cascade |

`type` refers to an enumerated type that defines how the entry is styled. By default, most entries will be simple links styled similar to twitter/facebook link cards. However, a user may opt to style an entry like a horizontal ruler, or a header, or a text box, to better organize their repo.

`rating` refers to a user defined rating of a particular entry. Users may increase or decrease the rating of an entry to signify its importance.

`sequence` refers to what position the entry will appear at in the list when viewing the repo. E.g. 0 will show up on top, then 1, etc. 

__Repo__

| access_key | pass_phrase | title | description | is_private | last_visited | 
--- | --- | --- | --- | --- | --- 
| Text, PK | Text | Text, Nullable (Max: 50) | Text, Nullable (Max: 300) | Boolean, default=False | Date, default=Creation time |

The `access_key` is a hash of a random seed generated for each repo, it serves as the primary key in the database and as the resource identifier in url routes.
The `pass_phrase` is a an encrypted, salted hash. Viewers of a repo must enter the passphrase before being given editing priviledges, or to view the repo if `is_private` is `True`.
`last_visited` is the date and time that any user has accessed the repo (I plan to cull inactive repos)


## Future Goals
I would like to move away from session based auth and move towards JSON Web Tokens for authentication and authorization between the front end and back end, allowing the appilcation's API to stand on its own from the browser. I would also like to allow users to import/export their repositories as markdown. In addition, allow users to create accounts so that they have automatic authorization for all of their created repositories, and to give the ability to share private, password-protected repositories without also allowing editing access.
