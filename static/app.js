const NOIMG = '/static/images/globe.png';
const AUTH = {view : 0, edit : 1} // For rendering purposes

// TO DO: Error handling, API response flashing, load-in spinner
// TO DO: Entry sorting, re-ordering

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
        // TO DO: no anchor tag if this.url is null
        const img = this.image ? this.image : NOIMG;
        let markup = '';
        switch (this.type){
            case 'link':
                markup = '<div>';
                if (viewState === AUTH.edit){
                    markup = markup + `
                    <button id="delete_${index}">X</button>
                    <button id="edit_${index}">Edit</button>`;
                }
                markup = markup + `
                <img src="${img}" onerror="imgError(this);" width=50 height=50>
                <a href="${this.url}">${this.title}</a>
                </div>`;
                break;
            case 'divider':
                markup = '<div>';
                if (viewState === AUTH.edit){
                    markup = markup + `
                    <button id="delete_${index}">X</button>
                    <button id="edit_${index}">Edit</button>`;
                }
                markup = markup + `
                <hr>
                </div>`;
                break;
            case 'text_box':
                markup = '<div>';
                if (viewState === AUTH.edit){
                    markup = markup + `
                    <button id="delete_${index}">X</button>
                    <button id="edit_${index}">Edit</button>`;
                }
                markup = markup + `
                    <p><b>${this.title}</b> <br>
                    ${this.description}
                    </p>
                </div>`;
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
                if (entry.state != 'DELETE' && entry.state != '_DELETED'){ // Don't render entries marked for deletion
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
        const data = {
            id: null, title: metaData.title ? metaData.title : metaData.site_name, description: metaData.description,
            image: metaData.image, url: metaData.url ? metaData.url : url, entry_type: 'link',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
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

    commitRepoChanges(){
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

    async commitEntryChanges(){
        // parse repo changes and send to server
        // array[0] = array of json data to send to server
        // array[1] = references to Entry objects
        const toAdd = [[], []];
        const toChange = [[], []];
        const toDelete = [[], []];
        for (let entry of this.entries){
            switch (entry.state){
                case 'NEW':
                    toAdd[0].push(Entry.toJSON(entry));
                    toAdd[1].push(entry);
                    break;
                case 'CHANGE':
                    toChange[0].push(Entry.toJSON(entry));
                    toChange[1].push(entry);
                    break;
                case 'DELETE':
                    toDelete[0].push(entry.id);
                    toDelete[1].push(entry);
                    break;
            }
        }
        const endPoint = `/api/repo/${this.accessKey}/entries`;
        try {
            let changes = false;
            if (toAdd[0].length > 0){
                await axios.post(`${endPoint}/new`, {'new' : toAdd[0]});
                changes=true;
                for (let entry of toAdd[1]){
                    entry.state = 'UPDATED';
                }
            }

            if (toChange[0].length > 0){
                await axios.patch(endPoint, {'change' : toChange[0]});
                changes=true;
                for (let entry of toChange[1]){
                entry.state = 'UPDATED';
                }
            }

            if (toDelete[0].length > 0){
                await axios.delete(endPoint, {data: {'delete' : toDelete[0]}});
                changes=true;
                for (let entry of toDelete[1]){
                    entry.state = '_DELETED';
                }
            }
            
            if (changes){
                flash('Changes saved.');
            }
            else{
                flash('Repo up to date.');
            }

        } catch (err) {
            throw `Could not save changes. Error msg: ${err}`;
        }
    }
}
let flashTimer
function flash(message){
    clearInterval(flashTimer);
    const flashDiv = document.getElementById('flashes');
    flashDiv.innerHTML = `<p>${message}</p>`;
    flashTimer = setTimeout(()=>{
        flashDiv.innerHTML = '';
    }, 2000);
}

// Replace broken link thumbnails with generic globe image
function imgError(image){
    image.src = NOIMG;
    image.onerror = "";
    return true;
}

async function loadRepoData(accessKey){
    let res
    try {
        res = await axios.get(`/api/repo/${accessKey}`);
    } catch (err) {
        if (err.response.status === 401 || err.response.status === 403) {
            // Redirect on unauthorized
            window.location = `/repo/auth?access_key=${accessKey}`; 
        }
    }
    
    if (res){
        // Load in data from server
        const repo = new Repo(res.data);
        repo.displayRepoInfo();
        repo.refreshEntryList();
        // Only setup editing listeners if we're authorized to edit
        if (viewState === AUTH.edit){
            initEditEventListeners(repo);
        } else {
            // Always set up the control div handler, so user can click edit button to bring up auth
            document.getElementById('controls').addEventListener('click', (evt) => {controlEventHandler(evt, repo)});
        }
    }
}

function initEditEventListeners(repo){
    const controls = document.getElementById('controls');
    const entryList = document.getElementById('repo-entries');
    const entryEditForm = document.getElementById('entry-edit-form');
    const newLinkForm = document.getElementById('new-link-form');
    const repoEditForm = document.getElementById('repo-edit-form');

    controls.addEventListener('click', (evt) => {controlEventHandler(evt, repo)});
    entryList.addEventListener('click', (evt) => {entriesEventHandler(evt, repo)});
    entryEditForm.addEventListener('submit', (evt) => {entryEditSubmitHandler(evt, repo)});
    
    newLinkForm.addEventListener('submit', (evt) => {
        evt.preventDefault();
        const link = newLinkForm.new.value;
        repo.addLink(link);
        newLinkForm.new.value = '';
        window.addEventListener("beforeunload", unSavedChangesHandler, {capture: true});
    });

    repoEditForm.addEventListener('submit', (evt) => {
        evt.preventDefault();
        try{
            repo.commitRepoChanges();
            flash('Changes saved.');
        } catch {
            flash('Something went wrong. Please try again later.');
        }
    });
}

function unSavedChangesHandler(evt){
    evt.preventDefault();
    return evt.returnValue = 'Are you sure you want to exit? This repo has unsaved changes.';
}

function controlEventHandler(evt, repo){
    switch (evt.target.id){
        case 'btn-new-divide':
            repo.addDivider();
            window.addEventListener("beforeunload", unSavedChangesHandler, {capture: true});
            break;
        case 'btn-new-tbox':
            repo.addTextBox();
            window.addEventListener("beforeunload", unSavedChangesHandler, {capture: true});
            break;
        case 'btn-save-changes':
            try{
                repo.commitEntryChanges();
                window.removeEventListener("beforeunload", unSavedChangesHandler, {capture: true});
            } catch {
                flash("Something went wrong. Please try again later.")
            }
            break;
        case 'btn-edit-repo':
            const div = document.getElementById('repo-edit-div')
            div.hidden = !div.hidden;
            if (div.hidden == false ) loadRepoIntoEditForm(repo);
            break;
        case 'btn-auth-repo':
            window.location =`/repo/auth?access_key=${repo.accessKey}`; 
            break;
    }
}

function entriesEventHandler(evt, repo){
    const [method, entryIndex] = evt.target.id.split('_');
    switch (method){
        case 'edit':
            // Toggle visibility of Entry Editing Form
            document.getElementById('entry-edit-div').hidden = false;
            loadEntryIntoEditForm(repo, entryIndex);
            break;
        case 'delete':
            repo.deleteEntry(entryIndex);
            break;
    }
}

function entryEditSubmitHandler(evt, repo){
    evt.preventDefault();
    const entryEditForm = evt.target;
    const entryIndex = +entryEditForm.getAttribute('data-entryIndex');
    const entry = repo.entries[entryIndex];
    // Update entry to form values
    entry.title = entryEditForm.entryTitle.value;
    entry.description = entryEditForm.entryDesc.value;
    entry.url = entryEditForm.entryURL.value;
    entry.type = entryEditForm.entryType.value;
    entry.image = entryEditForm.entryImage.value ? entryEditForm.entryImage.value : NOIMG;
    entry.state = entry.state === 'NEW' ? 'NEW' : 'CHANGE'
    // Clear and hide form, update DOM
    entryEditForm.entryTitle.value = '';
    entryEditForm.entryDesc.value = '';
    entryEditForm.entryURL.value = '';
    entryEditForm.entryType.value = '';
    entryEditForm.entryImage.value = '';
    document.getElementById('entry-edit-div').hidden = true;
    window.addEventListener("beforeunload", unSavedChangesHandler, {capture: true});
    repo.refreshEntryMarkup(entryIndex);
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

