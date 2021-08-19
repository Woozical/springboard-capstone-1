# Capstone Project Proposal - Link Repository
## Summary

The link aggregator site serves as a tool to create repositories of links, while also providing aesthetic and organizational features. It is more lightweight than pinterest, and more visual than a pastebin. Many communities require a central location to link to their various resources, often pastebin is used. Or, they need to collate related links together (e.g. installation guides, wish lists, to do lists, bookmarks). This website will allow users to create and share repositories for their links without having to register accounts. In their repository, users can do things such as create dividers, enable website preview thumbnails, assign a rank to each entry, and automatically or manually order how their links are displayed.

The data involved is primarily scraped OpenGraph metadata from websites used to build and style each link entry in a repository. Each repository has two cryptographic hashes corresponding with it: one for owner access, and one for viewer access. These keys are used in the URL for a repo. With cookies enabled, access keys are saved to the session and displayed on the landing page, otherwise a user can simply bookmark the URL to their repo or save the key elsewhere.

## Schema

__Entries__

| id | title | description | image | resource | rank | order | repo_id |
--- | --- | --- | --- | --- | --- | --- | --- 
| PK | Text | Text, Nullable | Text, Nullable | Text | Integer, Nullable | Integer, Nullable | FK(repo.id), OD=Cascade |


__Repo__

| id | owner_key | viewer_key | title | description |
--- | --- | --- | --- | --- 
| PK | Text, Unique | Text, Unique | Text, Nullable | Text, Nullable |

## User Flow

User accesses the landing page. Here they see the option to create a new repo, input an access key to be redirected to an existing repo, or if cookies are enabled, see a list of their repos.

### Create new repo
A form is brought up, prompting the user to input a title and description for their repository. On a validated submission, they are brought to their new, empty repo with owner access. On first viewing, their owner access key is highlighted.

### Repo View
The list of entries appears on the left side of the screen. Title and description of the repo is on the right side.

__(Owner Only)__
On the right side, a panel for auto-sorting by title/description/site name/rating. A button to add a new entry. A toggle for link thumbnails.
Next to each entry, ability to manually adjust the order of each entry (higher/lower on list). On each entry, buttons to edit/delete that entry, and increase/decrease it’s rank.
A button to commit all changes (ordering and new entries will be saved to the database)

### Add Entry
Form to create a new entry is brought up, only a URL is required. On entering a URL, all other fields (title, description, image, etc) are auto-populated with scraped meta-data. User can manually adjust these fields if they wish. By default, new links are sent to the bottom of the list.

## Other Notes
API issues - Free request limit of 100/month is pretty limited for the production use case, may use external API as failsafe in case of homemade scraping falling short / being blocked? API may fail to circumvent anti-scraping measures on pages.

At this stage, there is not much sensitive information being stored. It may be on the table of creating user accounts, so that owner and viewer keys may be easily viewed or renamed. In which case, emails and passwords will need to be protected, with the latter obviously being hashed.

Stretch Goal: Allow users to import/export text with markdown to auto-populate their repo.
