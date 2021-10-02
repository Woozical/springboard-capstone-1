const NOIMG = '/static/images/globe.png';
const AUTH = {view : 0, edit : 1} // For rendering purposes

/* Displays API response messages */
let opacityTimer, messageTimer;
function flash(message, category){
    clearInterval(opacityTimer);
    clearInterval(messageTimer);
    const flashDiv = document.getElementById('flashes');
    flashDiv.classList.add(`alert-${category}`, 'fade-in');
    flashDiv.classList.remove('fade-out');
    flashDiv.innerText = message;
    opacityTimer = setTimeout(()=>{
        flashDiv.classList.remove('fade-in');
        flashDiv.classList.add('fade-out');
    }, 2000);
    messageTimer = setTimeout(() =>{
        flashDiv.classList.remove(`alert-${category}`);
        flashDiv.innerHTML = '<span>&#8203;</span>';
    }, 3100);
}

// Replace broken link thumbnails with generic globe image
function imgError(image){
    image.src = NOIMG;
    image.onerror = "";
    return true;
}

/* Changes the color of the save button to indicate unsaved changes */
function alertSave(clear=false){    
    const btn = document.getElementById('btn-save-changes');
    if (clear){
        btn.classList.remove('btn-outline-warning');
        btn.classList.add('btn-outline-success');
    } else {
        btn.classList.remove('btn-outline-success');
        btn.classList.add('btn-outline-warning');
    }
}

// Toggles the display of the fullscreen loading spinner, to be called on load in while waiting for AJAX response
function toggleLoading(){
    const loadDiv = document.getElementById('loading');
    const on = (loadDiv.style.display === 'block');
    loadDiv.style.display = on ? 'none' : 'block';
}

/* Kickstarts the application by loading in repository information from the server */
function loadRepoData(accessKey){
    toggleLoading();
    axios.get(`/api/repo/${accessKey}`)
    .then((res) => {
        // Load in data from server
        const repo = new Repo(res.data);
        repo.displayRepoInfo();
        repo.refreshEntryList();
        // Only bother with setting up editing listeners if we're authorized to edit
        if (viewState === AUTH.edit){
            initEditEventListeners(repo);
            modalCloseHandlers();
        }
        toggleLoading();
    })
    .catch((err) => {
        if ((err.response) && (err.response.status === 401 || err.response.status === 403)){
            // Redirect on unauthorized
            window.location = `/repo/auth?access_key=${accessKey}`;
        }
        flash('Critical Error: Could not load repo data.', 'danger');
        toggleLoading();
    });
}
/* Sets up event listeners related to all editing controls */
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
        const links = newLinkForm.new.value;
        let changesMade = false;
        for (let link of links.split('\n')){
            if (link){
                repo.addLink(link);
                changesMade = true;
            }
        }
        if (changesMade) alertSave();
        newLinkForm.new.value = '';
    });

    repoEditForm.addEventListener('submit', (evt) => {
        evt.preventDefault();
        toggleLoading();
        repo.commitRepoChanges()
        .then( () => {
            flash('Changes saved.', 'success');
            repo.displayRepoInfo();
        })
        .catch( (err) => {
            flash('Error. Please try again later.', 'danger');
        })
        .then( () => {
            document.getElementById('repo-edit-div').style.display = 'none';
            toggleLoading();
        });
    });
}


/* Sets up event listeners to close each modal type */
function modalCloseHandlers(){
    const repoModal = document.getElementById('repo-edit-div');
    const deleteModal = document.getElementById('repo-delete-div');
    const entryModal = document.getElementById('entry-edit-div');
    const helpModal = document.getElementById('help-modal');

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

    helpModal.addEventListener('click', function(evt){
        switch(evt.target.id){
            case 'close-help-modal':
                helpModal.style.display = 'none';
                break;
            case 'help-modal':
                helpModal.style.display = 'none';
                break;
        }
    })

}

/* Region click handler for the control panel */
function controlClickHandler(evt, repo){
    const id = evt.target.classList.contains('bi') ? evt.target.parentNode.id : evt.target.id;
    switch (id){
        case 'btn-new-divide':
            repo.addDivider();
            alertSave();
            break;
        case "help-btn":
            document.getElementById('help-modal').style.display = 'block';
            break;
        case 'btn-new-tbox':
            repo.addTextBox();
            alertSave();
            break;
        case 'btn-save-changes':
            repo.commitEntryChanges()
            .then( () => {
                alertSave(clear=true);
                flash('Changes saved.', 'success');
                repo.refreshEntryList();
            })
            .catch( (err) => {
                console.error(err);
                flash("Server Error. Please try again later.", 'danger')
            });
            break;
        case 'btn-edit-repo':
            document.getElementById('repo-edit-div').style.display = 'block';
            loadRepoIntoEditForm(repo);
            break;
        case "btn-delete-repo":
            document.getElementById('repo-delete-div').style.display = 'block';
            break;
    }
}

/* Submit handler for the repo delete confirmation form */
function deleteConfirmationHandler(evt, repo){
    evt.preventDefault();
    toggleLoading();
    const pw = evt.target.pass_phrase.value;
    axios.delete(`/api/repo/${repo.accessKey}`, {data: {'pass_phrase' : pw}})
    .then( (response) => {
        if (response.status === 200) window.location = '/';
    })
    .catch( (err) => {
        document.getElementById('repo-delete-response').innerText = 'Incorrect password';
        evt.target.pass_phrase.value = '';
        toggleLoading();
    });
}

/* Region click handler for the entry list */
function entriesClickHandler(evt, repo){
    const [method, entryIndex] = evt.target.id.split('_');
    switch (method){
        case 'edit':
            // Delete entry if CTRL is held
            if (evt.ctrlKey){
                repo.deleteEntry(entryIndex);
                alertSave();
            // Toggle visibility of Entry Editing Form
            } else {
                document.getElementById('entry-edit-div').style.display = 'block';
                loadEntryIntoEditForm(repo, +entryIndex);
            }
            break;
        // Sequence shifting
        case 'up':
            repo.shiftEntry(+entryIndex, -1);
            alertSave();
            break;
        case 'down':
            repo.shiftEntry(+entryIndex, +1);
            alertSave();
            break;
    }
}

/* Submit handler for the entry edit form. */
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
/* Handler for the delete button in the entry edit form */
function entryDeleteHandler(evt, repo){
    const form = document.getElementById('entry-edit-form');
    const entryIndex = form.getAttribute('data-entryIndex');
    repo.deleteEntry(entryIndex);
    alertSave();
    document.getElementById('entry-edit-div').style.display = 'none';
}
/* Populates the repo edit form's fields with the repo's current information */
function loadRepoIntoEditForm(repo){
    const form = document.getElementById('repo-edit-form');
    form.repoTitle.value = repo.title;
    form.repoDesc.value = repo.description;
    form.repoPrivacy.checked = repo.isPrivate;
}
/* Populates the entry edit form field's with the clicked-on entry's current information */
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

