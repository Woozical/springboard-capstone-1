# Capstone Project Proposal - Link Repository
## Summary

The link aggregator site serves as a tool to create repositories of links, while also providing aesthetic and organizational features. It is more lightweight than pinterest, and more visual than a pastebin. Many communities require a central location to link to their various resources, often pastebin is used. Or, they need to collate related links together (e.g. installation guides, wish lists, to do lists, bookmarks). This website will allow users to create and share repositories for their links without having to register accounts. In their repository, users can do things such as create dividers, enable website preview thumbnails, assign a rank to each entry, and automatically or manually order how their links are displayed.

The data involved is primarily scraped OpenGraph metadata from websites used to build and style each link entry in a repository. Each repository has two cryptographic hashes corresponding with it: one for owner access, and one for viewer access. These keys are used in the URL for a repo. With cookies enabled, access keys are saved to the session and displayed on the landing page, otherwise a user can simply bookmark the URL to their repo or save the key elsewhere.

## Schema

__Entries__

| id | title | description | image | url | entry_type | rating | sequence | repo_access_key |
--- | --- | --- | --- | --- | --- | --- | --- | ---
| PK | Text | Text, Nullable | Text, Nullable | Text | enum default='url' | Integer, Nullable | Integer, Nullable | Text FK(repo.access_key), OD=Cascade |

entry_type refers to an enumerated type that defines how the entry is styled. By default, most entries will be simple links styled similar to twitter/facebook link cards. However, a user may opt to style an entry like a horizontal ruler, or a header, or a text box, to better organize their repo.

rating refers to a user defined rating of a particular entry. Users may increase or decrease the rating of an entry to signify its importance.

sequence refers to what position the entry will appear at in the list when viewing the repo. E.g. 0 will show up on top, then 1, etc. 

__Repo__

| access_key | pass_phrase | title | description | is_private | last_visited | 
--- | --- | --- | --- | --- | --- 
| Text, PK | Text | Text, Nullable | Text, Nullable | Boolean, default=False | Date, default=Creation time |

The `access_key` is a hash of a random seed generated for each repo, it serves as the primary key in the database and as the resource identifier in url routes.
The `pass_phrase` is a an encrypted, salted hash. Viewers of a repo must enter the passphrase before being given editing priviledges, or to view the repo if `is_private` is `True`.
`last_visited` is the date and time that any user has accessed the repo (I plan to cull inactive repos)

## User Flow

User accesses the landing page. Here they see the option to create a new repo, input an access key to be redirected to an existing repo, or if cookies are enabled, see a list of their created repos.

### Create new repo
A form is brought up, prompting the user to create a passphrase for editing priviledges on their repository. The user can opt for a randomly generated passphrase. The passphrase field is displayed as plain text but is encrpyted on the DB. The user is notified to save their passphrase as there is no way to retrieve it. Entering a title and description for their repository is optional. On a validated submission, they are brought to their new, empty repo with editing access. On first viewing, their access key is highlighted.

### Repo View
The list of entries appears on the left side of the screen. Title, description, search and editing options for the repo are displayed on the right side.

__(Authorized Only - Editing View)__
On the right side, a panel for auto-sorting by title/description/site name/rating. A button to add a new entry. A toggle for link thumbnails.
Next to each entry, ability to manually adjust the order of each entry (higher/lower on list). On each entry, buttons to edit/delete that entry, and increase/decrease it’s rank.
A button to commit all changes (ordering and new entries will be saved to the database)

### Add Entry
Form to create a new entry is brought up, only a URL is required. On entering a URL, all other fields (title, description, image, etc) are auto-populated with scraped meta-data. User can manually adjust these fields if they wish. By default, new links are sent to the bottom of the list.

## Other Notes
API issues - Free request limit of 100/month is pretty limited for the production use case, may use external API as failsafe in case of homemade scraping falling short / being blocked? API may fail to circumvent anti-scraping measures on pages.

At this stage, there is not much sensitive information being stored. It may be on the table of creating user accounts, so that owner and viewer keys may be easily viewed or renamed. In which case, emails and passwords will need to be protected, with the latter obviously being hashed.

Stretch Goal: Allow users to import/export text with markdown to auto-populate their repo. Account creation and authorization, logged in users automatically have editing privileges for their repos without needing to input the repo's passphrase.
