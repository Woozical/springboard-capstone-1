const NOIMG = '/static/images/globe.png';
const AUTH = {view : 0, edit : 1} // For rendering purposes

// TO DO: load-in spinner

class Component {

    static stars(count){
        return '<i class="text-warning bi bi-star-fill"></i>'.repeat(count);
    }

    static editButtons(index){
        return `
        <div>
            <i class="bi bi-caret-up" id="up_${index}"></i>
            <div>
                <i class="bi bi-gear" id="edit_${index}"></i>
            </div>
            <i class="bi bi-caret-down" id="down_${index}"></i>
        </div>`;
    }

    static divider(index, entry){
        const edit = (viewState === AUTH.edit) ? Component.editButtons(index) : '';
        const text = entry.url ?
            `<div class="ruler-words"><a class="ruler-link"href=${entry.url}>${entry.title}</a> ${Component.stars(entry.rating)}</div>` :
            `<div class="ruler-words">${entry.title}  ${Component.stars(entry.rating)}</div>`;
        return `
        <div class="row">
            <div class="col-auto">
                ${edit}
            </div>
            <div class="col-11">
                <div class="ruler">
                    <div class="ruler-line"><div></div></div>
                    ${text}
                    <div class="ruler-line"><div></div></div>
                </div>
            </div>
        </div>`;
    }

    static linkCard(index, entry){
        const edit = (viewState === AUTH.edit) ? Component.editButtons(index) : '';
        return `
        <div class="row">
        <div class="col-auto">
            ${edit}
        </div>
        <div class="col-11">
            <div class="card">
                <div class="card-body">
                    <div class="row">
                        <div class="col-10">
                            <h6 class="card-title"><a href="${entry.url}">${entry.title}</a> ${Component.stars(entry.rating)}</h6>
                            <p class="card-text fs-7">${entry.description}</p>
                            <small><a class="text-muted" href="${entry.url}">${entry.url}</a></small>
                        </div>
                        <div class="col-2">
                            <img onerror="imgError(this);" src="${entry.image}" class="card-img rounded float-right">
                        </div>
                    </div>
                </div>
            </div>
        </div>
        </div>`;
    }

    static textBox(index, entry){
        const edit = (viewState === AUTH.edit) ? Component.editButtons(index) : '';
        const link = entry.url ?
            `<div class="card-footer"><a href="${entry.url}">${entry.url}</a></div>` :
            '';
        const image = entry.image ?
            `<img onerror="imgError(this);" class="tBox-image" src=${entry.image} align="right" />` : 
            '';
        return `
        <div class="row">
            <div class="col-auto">
                ${edit}
            </div>
            <div class="col-11">
                <div class="card">
                    <div class="card-body">
                        <h5 class="card-title text-center">${entry.title}  ${Component.stars(entry.rating)}</h5>
                        ${image}
                        <p class="card-text">${entry.description}</p>
                    </div>
                    ${link}
                </div>
            </div>
        </div>`
    }
}

class Entry {
    // TO DO: Make url a URL object, and make use of those properties
    static idGen = Entry.generateID();
    constructor({id, title, description, image, url, type, rating, sequence}, state){
        this.id = id ? id : Entry.idGen.next().value;
        this.title = title;
        this.description = description ? description : '';
        this.image= image;
        this.url = url;
        this.type = type;
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

    updateWithMetaData(metaData){
        if (metaData.title) {
            this.title = metaData.title;
        } else if (metaData.site_name) {
            this.title = metaData.site_name;
        }
        this.description = metaData.description ? metaData.description : this.description;
        this.image = metaData.image ? metaData.image : this.image;
        this.url = metaData.url ? metaData.url : this.url;
    }

    generateMarkup(index){
        switch (this.type){
            case 'link':
                return Component.linkCard(index, this);
            case 'divider':
                return Component.divider(index, this);
            case 'text_box':
                return Component.textBox(index, this);
        }
        throw(`Entry ${this} has invalid type ${this.type}`)
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
        const entriesList = document.getElementById('repo-entries');
        entriesList.innerHTML = '';

        this.entries.forEach(
            (entry, index) => {
                if (entry.state != 'DELETE' && entry.state != '_DELETED'){ // Don't render entries marked for deletion
                    const div = document.createElement('div');
                    div.id = `entry_${index}`;
                    div.innerHTML = entry.generateMarkup(index);
                    entriesList.append(div);
                }
            }
        );
    }

    refreshEntryMarkup(entryIndex){
        const entryDiv = document.getElementById(`entry_${entryIndex}`);
        const entry = this.entries[entryIndex];
        entryDiv.innerHTML = entry.generateMarkup(entryIndex);
    }

    addDivider(){
        const data = {
            id : null, title: 'New Divider', description: null,
            image: null, url: null, type: 'divider',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
    }

    addTextBox(){
        const data = {
            id : null, title: 'New Text Box', description: '...',
            image: null, url: null, type: 'text_box',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
    }

    async addLink(url){
        // add new link entry to the DOM
        // scrape data on URL through server
        // once we have metadata, refresh entry to show it
        const newEntryIdx = this.entries.length;
        const data = {id: null, title: url, description: null, image: null,
            url: url, type: 'link', rating: null, sequence: newEntryIdx}
        const newEntry = new Entry(data, 'NEW');
        this.entries.push(newEntry);
        this.refreshEntryList();
        
        const repo = this;
        axios.get('/api/scrape', { params: {'url' : encodeURIComponent(url)} }).then(
            function (response){
                newEntry.updateWithMetaData(response.data.data);
                repo.refreshEntryMarkup(newEntryIdx);
            }
        );
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

    swapEntries(eOneIdx, eTwoIdx){
        console.log('Swapping', eOneIdx, eTwoIdx);
        // Swaps the positions of entry one and entry two in the repo's entry array
        [this.entries[eOneIdx], this.entries[eTwoIdx]] = [this.entries[eTwoIdx], this.entries[eOneIdx]];
        this.entries[eOneIdx].sequence = eOneIdx;
        this.entries[eTwoIdx].sequence = eTwoIdx;
        this.entries[eOneIdx].state = 'CHANGE';
        this.entries[eTwoIdx].state = 'CHANGE';

        this.refreshEntryMarkup(eOneIdx);
        this.refreshEntryMarkup(eTwoIdx);
    }

    async commitRepoChanges(){
        const form = document.getElementById('repo-edit-form');
        this.title = form.repoTitle.value;
        this.description = form.repoDesc.value;
        this.isPrivate = form.repoPrivacy.checked;
        const data = {
            title : this.title,
            description: this.description,
            is_private : this.isPrivate
        }
        const repo = this;
        await axios.patch(`/api/repo/${this.accessKey}`, data)
        .then( function(response){
            if (response.status === 200){
                flash('Changes saved.', 'success');
                repo.displayRepoInfo();
            }
        })
        .catch( function(error){
            flash('Something went wrong. Please try again later.', 'danger');
            console.error(error);
        });
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
                flash('Changes saved.', 'success');
            }
            else{
                flash('Repo up to date.', 'info');
            }
        } catch (err) {
            throw `Could not save changes. Error msg: ${err}`;
        }
    }
}
let flashTimer
function flash(message, category){
    clearInterval(flashTimer);
    const flashDiv = document.getElementById('flashes');
    flashDiv.innerHTML = `<div class="alert alert-${category}">${message}</div>`;
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

function alertSave(clear=false){
    const div = document.getElementById('unsaved');
    if (clear){
        div.style.display= 'none';
    } else {
        div.style.display = 'block';
    }
}

// Toggles the display of the fullscreen loading spinner, to be called while waiting for AJAX response
function toggleLoading(){
    const loadDiv = document.getElementById('loading');
    const on = (loadDiv.style.display === 'block');
    loadDiv.style.display = on ? 'none' : 'block';
}

async function loadRepoData(accessKey){
    toggleLoading();
    let res
    try {
        
        res = await axios.get(`/api/repo/${accessKey}`);
    } catch (err) {
        if (err.response.status === 401 || err.response.status === 403) {
            // Redirect on unauthorized
            window.location = `/repo/auth?access_key=${accessKey}`; 
        } else {
            flash('Critical Error: Could not load repository data.', 'danger');
        }
    }
    
    if (res){
        // Load in data from server
        const repo = new Repo(res.data);
        repo.displayRepoInfo();
        repo.refreshEntryList();
        // Only bother with setting up editing listeners if we're authorized to edit
        if (viewState === AUTH.edit){
            initEditEventListeners(repo);
            modalCloseHandlers();
        } else {
            // Always set up the control div handler, so user can click edit button to bring up auth
            document.getElementById('controls').addEventListener('click', (evt) => {controlClickHandler(evt, repo)});
        }
        
    }
    toggleLoading();
}

function initEditEventListeners(repo){
    const controls = document.getElementById('controls');
    const entryList = document.getElementById('repo-entries');
    const entryEditForm = document.getElementById('entry-edit-form');
    const newLinkForm = document.getElementById('new-link-form');
    const repoEditForm = document.getElementById('repo-edit-form');
    const repoDeleteForm = document.getElementById('repo-delete-form');
    const entryDeleteBtn = document.getElementById('btn-entry-delete');

    controls.addEventListener('click', (evt) => {controlClickHandler(evt, repo)});
    entryList.addEventListener('click', (evt) => {entriesClickHandler(evt, repo)});
    entryDeleteBtn.addEventListener('click', (evt) => {entryDeleteHandler(evt, repo)});
    entryEditForm.addEventListener('submit', (evt) => {entryEditSubmitHandler(evt, repo)});
    repoDeleteForm.addEventListener('submit', (evt) => {deleteConfirmationHandler(evt, repo)});
    
    newLinkForm.addEventListener('submit', (evt) => {
        evt.preventDefault();
        const link = newLinkForm.new.value;
        repo.addLink(link);
        newLinkForm.new.value = '';
        alertSave();
    });

    repoEditForm.addEventListener('submit', (evt) => {
        evt.preventDefault();
        repo.commitRepoChanges();
        document.getElementById('repo-edit-div').style.display = 'none';
    });
}

function modalCloseHandlers(){
    const repoModal = document.getElementById('repo-edit-div');
    const deleteModal = document.getElementById('repo-delete-div');
    const entryModal = document.getElementById('entry-edit-div');

    repoModal.addEventListener('click', function(evt){
        switch(evt.target.id){
            case 'close-repo-modal':
                repoModal.style.display = 'none';
                break;
            case 'repo-edit-div':
                repoModal.style.display = 'none';
                break;
        }
    });

    deleteModal.addEventListener('click', function(evt){
        switch(evt.target.id){
            case 'btn-close-repo-delete':
                deleteModal.style.display = 'none';
                break;
            case 'repo-delete-div':
                deleteModal.style.display = 'none';
                break;
        }
    });

    entryModal.addEventListener('click', function(evt){
        switch(evt.target.id){
            case 'close-entry-modal':
                entryModal.style.display = 'none';
                break;
            case 'entry-edit-div':
                entryModal.style.display = 'none';
                break;
        }
    });

}

// Event handler for the control panel
function controlClickHandler(evt, repo){
    switch (evt.target.id){
        case 'btn-new-divide':
            repo.addDivider();
            alertSave();
            break;
        case 'btn-new-tbox':
            repo.addTextBox();
            alertSave();
            break;
        case 'btn-save-changes':
            try{
                repo.commitEntryChanges();
                alertSave(clear=true);
            } catch {
                flash("Something went wrong. Please try again later.", 'danger')
            }
            break;
        case 'btn-edit-repo':
            document.getElementById('repo-edit-div').style.display = 'block';
            loadRepoIntoEditForm(repo);
            break;
        case 'btn-auth-repo':
            window.location =`/repo/auth?access_key=${repo.accessKey}`; 
            break;
        case "btn-delete-repo":
            document.getElementById('repo-delete-div').style.display = 'block';
            break;
    }
}

async function deleteConfirmationHandler(evt, repo){
    evt.preventDefault();
    const pw = evt.target.pass_phrase.value;
    await axios.delete(`/api/repo/${repo.accessKey}`, {data: {'pass_phrase' : pw}})
    .then( function(response){
        if (response.status === 200) window.location = '/';
    })
    .catch( function(){
        document.getElementById('repo-delete-response').innerText = 'Incorrect password';
        evt.target.pass_phrase.value = '';
        }
    );
}

function entriesClickHandler(evt, repo){
    const [method, entryIndex] = evt.target.id.split('_');
    switch (method){
        case 'edit':
            // Toggle visibility of Entry Editing Form
            if (evt.ctrlKey){
                repo.deleteEntry(entryIndex);
            } else {
                document.getElementById('entry-edit-div').style.display = 'block';
                loadEntryIntoEditForm(repo, +entryIndex);
            }
            break;
        // Sequence shifting
        case 'up':
            console.log('click up', entryIndex);
            if (entryIndex > 0){
                repo.swapEntries(+entryIndex, +entryIndex-1);
                alertSave();
            } else {
                repo.swapEntries(+entryIndex, repo.entries.length - 1);
                alertSave();
            };
            break;
        case 'down':
            console.log('click down', entryIndex);
            if (entryIndex < repo.entries.length -1){
                repo.swapEntries(+entryIndex, +entryIndex+1);
                alertSave();
            } else {
                repo.swapEntries(+entryIndex, 0);
                alertSave();
            };
            break;
    }
    console.log(repo);
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
    entry.image = entryEditForm.entryImage.value;
    entry.rating = entryEditForm.entryRating.value;
    entry.state = entry.state === 'NEW' ? 'NEW' : 'CHANGE'
    // Clear and hide form, update DOM
    entryEditForm.entryTitle.value = '';
    entryEditForm.entryDesc.value = '';
    entryEditForm.entryURL.value = '';
    entryEditForm.entryType.value = '';
    entryEditForm.entryImage.value = '';
    entryEditForm.entryRating.value = 0;
    document.getElementById('entry-edit-div').style.display = 'none';
    alertSave();
    repo.refreshEntryMarkup(entryIndex);
}

function entryDeleteHandler(evt, repo){
    const form = document.getElementById('entry-edit-form');
    const entryIndex = form.getAttribute('data-entryIndex');
    repo.deleteEntry(entryIndex);
    alertSave();
    document.getElementById('entry-edit-div').style.display = 'none';
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
    form.entryRating.value = entry.rating;
    form.setAttribute('data-entryIndex', entryIndex);
}

