const NOIMG = '/static/images/globe.png';

// TO DO: "Edit Mode" State
// TO DO: Error handling, API response flashing

class Entry {
    static idGen = Entry.generateID();
    constructor({id, title, description, image, url, entry_type, rating, sequence}, state){
        this.id = id ? id : Entry.idGen.next().value;
        this.title = title;
        this.description = description;
        this.image= image;
        this.url = url;
        this.type = entry_type;
        this.rating = rating;
        this.sequence = sequence;
        this.state = state;
    }

    static* generateID(){
        let id = -1;
        while (true){
            yield id;
            id--;
        }
    }

   static toJSON({id, title, description, image, url, type, rating, sequence}){
        return {id, title, description, image, url, type, rating, sequence};
    }

    generateMarkup(index){
        // TO DO: markup styling
        const img = this.image ? this.image : NOIMG;
        let markup = ''
        switch (this.type){
            case 'link':
                markup = `
                <div>
                    <button id="delete_${index}">X</button>
                    <button id="edit_${index}">Edit</button>
                    <img src="${img}" width=50 height=50>
                    <a href="${this.url}">${this.title}</a>
                </div>
                `;
                break;
            case 'divider':
                markup = `
                <button id="delete_${index}">X</button>
                <button id="edit_${index}">Edit</button>
                <hr>
                `
                break;
            case 'text_box':
                markup = `
                <div>
                    <button id="delete_${index}">X</button>
                    <button id="edit_${index}">Edit</button>
                    <p><b>${this.title}</b> <br>
                    ${this.description}
                    </p>
                </div>
                `
                break;  
        }
        return markup;
    }
    
}

class Repo {
    constructor({title, description, entries, access_key, is_private}){
        this.title = title ;
        this.description = description;
        this.accessKey = access_key;
        this.isPrivate = is_private;
        this.entries = [];
        for (let entry of entries){
            this.entries.push(
                new Entry(entry, "ORIGINAL")
            );
        }

        this.sortEntries();
        console.log(this);
    }

    sortEntries(sortType='sequence'){
        this.entries.sort( (a, b) => a[sortType] - b[sortType] );
    }

    displayRepoInfo(){
        if (this.title){
            document.title = this.title;
        }

        document.getElementById('repo-title').innerText = this.title ? this.title : 'Untitled Repo';
        document.getElementById('repo-desc').innerText = this.description;

    }
    refreshEntryList(){
        const entriesList = document.getElementById('repo-entry-list');
        entriesList.innerHTML = '';

        this.entries.forEach(
            (entry, index) => {
                if (entry.state != 'DELETE'){ // Don't render entries marked for deletion
                    const li = document.createElement('li');
                    li.id = `entry_${index}`;
                    li.innerHTML = entry.generateMarkup(index);
                    entriesList.append(li);
                }
            }
        );
    }

    refreshEntryMarkup(entryIndex){
        const entryLI = document.getElementById(`entry_${entryIndex}`);
        const entry = this.entries[entryIndex];
        entryLI.innerHTML = entry.generateMarkup(entryIndex);
    }

    addDivider(){
        const data = {
            id : null, title: 'New Divider', description: null,
            image: null, url: null, entry_type: 'divider',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
    }

    addTextBox(){
        const data = {
            id : null, title: 'New Text Box', description: '...',
            image: null, url: null, entry_type: 'text_box',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
    }

    async addLink(url){
        // scrape data on URL through server
        // TO-DO: make sure outgoing url has schema, no metadata request if not
        // set-up so that we don't wait on metadata to show the entry
        // once we have metadata, refresh entry to show it
        const scrape = await axios.get('/api/scrape', { params: {'url' : encodeURIComponent(url)} });
        const metaData = scrape.data.data;
        console.log(metaData);
        const data = {
            id: null, title: metaData.title ? metaData.title : metaData.site_name, description: metaData.description,
            image: metaData.image, url: url, entry_type: 'link',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
        console.log(this);
    }

    deleteEntry(entryIndex){
        const entry = this.entries[entryIndex];
        if (entry.state == 'NEW'){
            this.entries.splice(entryIndex, 1);
        } else {
            entry.state = 'DELETE';
        }
        this.refreshEntryList();
    }

    commitRepoChanges(event){
        event.preventDefault();
        const form = document.getElementById('repo-edit-form');
        this.title = form.repoTitle.value;
        this.description = form.repoDesc.value;
        this.isPrivate = form.repoPrivacy.checked;
        const data = {
            title : this.title,
            description: this.description,
            is_private : this.isPrivate
        }

        axios.patch(`/api/repo/${this.accessKey}`, data);
        this.displayRepoInfo();
        document.getElementById('repo-edit-div').hidden = true;
    }

    commitEntryChanges(){
        console.log(this);
        // parse repo changes and send to server
        const toAdd = [];
        const toChange = [];
        const toDelete = [];
        for (let entry of this.entries){
            switch (entry.state){
                case 'NEW':
                    toAdd.push(Entry.toJSON(entry));
                    break;
                case 'CHANGE':
                    toChange.push(Entry.toJSON(entry));
                    break;
                case 'DELETE':
                    toDelete.push(entry.id);
                    break;
            }
        }
        const endPoint = `/api/repo/${this.accessKey}/entries`;
        if (toAdd.length > 0) axios.post(`${endPoint}/new`, {'new' : toAdd});
        if (toChange.length > 0) axios.patch(endPoint, {'change' : toChange});
        if (toDelete.length > 0) axios.delete(endPoint, {data : {'delete' : toDelete }});
    }
}

async function loadRepoData(accessKey){
    // To Do: Break up this function, write event handlers separate where needed
    let res
    try {
        res = await axios.get(`/api/repo/${accessKey}`);
    } catch (err) {
        if (err.response.status === 401) {
            displayAuthForm(accessKey);
        }
    }
    
    if (res){
        // Load in data from server
        const repo = new Repo(res.data);
        repo.displayRepoInfo();
        repo.refreshEntryList();
        repo.commitEntryChanges();
        // Set up event listeners
        document.getElementById('btn-new-divide').addEventListener('click', () => {repo.addDivider()});
        document.getElementById('btn-new-tbox').addEventListener('click', () => {repo.addTextBox()});
        document.getElementById('btn-save-changes').addEventListener('click', () => {repo.commitEntryChanges()});
        document.getElementById('repo-edit-form').addEventListener('submit', (e) => {repo.commitRepoChanges(e)});
        
        const newLinkForm = document.getElementById('new-link-form');
        newLinkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const link = newLinkForm.new.value;
            repo.addLink(link);
            newLinkForm.new.value = '';
        });

        document.getElementById('btn-edit-repo').addEventListener('click', () => {
            // Toggle visibility of Repo Editing Form
            const div = document.getElementById('repo-edit-div')
            div.hidden = !div.hidden;
            if (div.hidden == false ) loadRepoIntoEditForm(repo);
        })

        const entriesList = document.getElementById('repo-entry-list');
        entriesList.addEventListener('click', function(e){
            const [method, entryIndex] = e.target.id.split('_');
            switch (method){
                case 'edit':
                    // Toggle visibility of Entry Editing Form
                    document.getElementById('entry-edit').hidden = false;
                    loadEntryIntoEditForm(repo, entryIndex);
                    break;
                case 'delete':
                    repo.deleteEntry(entryIndex);
                    break;
            }
        });

        const entryEditForm = document.getElementById('entry-edit-form');
        entryEditForm.addEventListener('submit', function(e){
            e.preventDefault();
            const entryIndex = +entryEditForm.getAttribute('data-entryIndex');
            const entry = repo.entries[entryIndex];
            entry.title = entryEditForm.entryTitle.value;
            entry.description = entryEditForm.entryDesc.value;
            entry.url = entryEditForm.entryURL.value;
            entry.type = entryEditForm.entryType.value;
            entry.image = entryEditForm.entryImage.value ? entryEditForm.entryImage.value : NOIMG;
            entry.state = entry.state === 'NEW' ? 'NEW' : 'CHANGE'

            entryEditForm.entryTitle.value = '';
            entryEditForm.entryDesc.value = '';
            entryEditForm.entryURL.value = '';
            entryEditForm.entryType.value = '';
            entryEditForm.entryImage.value = '';

            repo.refreshEntryMarkup(entryIndex);
            document.getElementById('entry-edit').hidden = true;
        });

    }
}

function loadRepoIntoEditForm(repo){
    const form = document.getElementById('repo-edit-form');
    form.repoTitle.value = repo.title;
    form.repoDesc.value = repo.description;
    form.repoPrivacy.checked = repo.isPrivate;
}

function loadEntryIntoEditForm(repo, entryIndex){
    const entry = repo.entries[entryIndex];
    const form = document.getElementById('entry-edit-form');

    form.entryTitle.value = entry.title;
    form.entryDesc.value = entry.description;
    form.entryURL.value = entry.url;
    form.entryType.value = entry.type;
    form.entryImage.value = entry.image === NOIMG ? '' : entry.image;
    form.setAttribute('data-entryIndex', entryIndex);

}

async function displayAuthForm(accessKey){
    // To Do: Move handling of this to server (see notes on disc)
    const content = document.getElementById('content');
    content.innerHTML = `
    <form id="auth-form">
        <label for="pw">Please enter the pass phrase:</label> <br>
        <input type="password" name="pw" id="pw" autocomplete="current-password">
        <p id="auth-result"></p>
        <button>Submit</button>
    </form>
    `;

    const form = document.getElementById('auth-form');

    form.addEventListener('submit', async function(e){
        e.preventDefault();
        data = {
            'access_key' : accessKey,
            'pass_phrase' : form.pw.value
        }
        try {
            await axios.post(`/api/repo/auth`, data=data);
            location.reload();
        } catch (err) {
            document.getElementById('auth-result').innerText = "Incorrect passphrase";
            form.pw.value = '';
        }
    })

}