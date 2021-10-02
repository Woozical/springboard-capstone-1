class Component {

    static stars(count){
        return '<i class="text-warning bi bi-star-fill"></i>'.repeat(count);
    }

    static editButtons(index){
        return `
        <div class="edit-icons">
            <i class="bi bi-caret-up" id="up_${index}"></i>
            <div class="edit-icons">
                <i class="bi bi-gear" id="edit_${index}"></i>
            </div>
            <i class="bi bi-caret-down" id="down_${index}"></i>
        </div>`;
    }

    static divider(index, entry){
        const edit = (viewState === AUTH.edit) ? Component.editButtons(index) : '';
        const text = entry.url ?
            `<div class="ruler-words"><a class="ruler-link link-light"href=${entry.url}>${entry.title}</a> ${Component.stars(entry.rating)}</div>` :
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
        const image = entry.image ? entry.image : NOIMG;
        const title = entry.url ? `<a href="${entry.url}">${entry.title}</a>` : `${entry.title}`
        return `
        <div class="row mb-1">
        <div class="col-auto">
            ${edit}
        </div>
        <div class="col-11">
            <div class="card bg-card-grey">
            <div class="row">
                <div class="col-10">
                <div class="card-body">
                    <h6 class="card-title">${title} ${Component.stars(entry.rating)}</h6>
                    <p class="card-text fs-7">${entry.description.replace(/\n/g, '<br>')}
                    </p>
                    <small class="card-text fs-8"><a class="text-muted" href="${entry.url}">${entry.url}</a></small>
                </div>
                </div>
                <div class="col-2">
                    <img height="100px;" onerror="imgError(this);" src="${image}" class="card-img link-image rounded float-right">
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
            `<img class="tBox-image rounded" src=${entry.image} align="right" />` : 
            '';

        return `
        <div class="row mb-1">
            <div class="col-auto">
                ${edit}
            </div>
            <div class="col-11">
                <div class="card bg-card-grey">
                    <div class="card-body">
                        <h5 class="card-title text-center">${entry.title}  ${Component.stars(entry.rating)}</h5>
                        ${image}
                        <p class="card-text">${entry.description.replace(/\n/g, '<br>')}</p>
                    </div>
                    ${link}
                </div>
            </div>
        </div>`;
    }
}

class Entry {
    static idGen = Entry.generateID();
    constructor({id, title, description, image, url, type, rating, sequence}, state){
        this.id = id ? id : Entry.idGen.next().value;
        this.title = title;
        this.description = description ? description : '';
        this.image= image;
        this.url = url;
        this.type = type;
        this.rating = rating ? rating: 0;
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
        return {id, title, description, image, url, type, rating : +rating, sequence : +sequence};
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
        this.entries = entries.map( (entry) => new Entry(entry, "ORIGINAL"));;
        this.deleted = [];

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
                const div = document.createElement('div');
                div.id = `entry_${index}`;
                div.innerHTML = entry.generateMarkup(index);
                entriesList.append(div);
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
            this.deleted.push(entry.id);
            this.entries.splice(entryIndex, 1);
        }
        this.resyncSequence();
        this.refreshEntryList();
    }

    shiftEntry(idx, dir){
        // Shift the position of this.entries[idx] by direction (e.g. +1, -1, +2)
        const elem = this.entries[idx];
        const len = this.entries.length;

        this.entries.splice(idx, 1);
        
        // Wrap-around if moving upwards from 0, or downwards from length-1
        if ((Math.abs(dir) != dir) && (idx === 0)){
            this.entries.splice((len+dir), 0, elem);
        } else {
            this.entries.splice((idx+dir) % len, 0, elem);
        }
        // [this.entries[eOneIdx], this.entries[eTwoIdx]] = [this.entries[eTwoIdx], this.entries[eOneIdx]];
        
        this.resyncSequence();
        this.refreshEntryList();
    }

    // Iterates through all entries in repo and sets their sequence to their index in this.entries
    resyncSequence(){
        for (let idx in this.entries){
            const entry = this.entries[idx];
            if (entry.sequence != idx){
                entry.sequence = idx;
                entry.state = entry.state === 'NEW' ? 'NEW' : 'CHANGE';
            }
        }
    }

    // Requests the API for updated entry information, usually called after committing new entries, as to get their IDs
    async resyncEntries(){
        const res = await axios.get(`/api/repo/${this.accessKey}`);
        this.entries = res.data.entries.map( (entry) => new Entry(entry, "ORIGINAL"));
        this.sortEntries();
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
        try {
            await axios.patch(`/api/repo/${this.accessKey}`, data);
        } catch (err) {
            throw `Could not save changes. Error msg: ${err}`;
        }
    }

    async commitEntryChanges(){
        // parse repo changes and send to server
        const toAdd = [];
        const toChange = [];
        const toDelete = this.deleted;
        for (let entry of this.entries){
            switch (entry.state){
                case 'NEW':
                    toAdd.push(Entry.toJSON(entry));
                    break;
                case 'CHANGE':
                    toChange.push(Entry.toJSON(entry));
                    break;
            }
        }
        const endPoint = `/api/repo/${this.accessKey}/entries`;
        const requests = [];
        // Send off requests in tandem
        if (toAdd.length > 0){
            requests.push(axios.post(endPoint, {'new' : toAdd}));
        }
        if (toChange.length > 0){
            requests.push(axios.patch(endPoint, {'change' : toChange}));
        }
        if (toDelete.length > 0){
            requests.push(axios.delete(endPoint, {data: {'delete' : toDelete}}));
        }

        try{
            await Promise.all(requests);
            // If successful, resync entry data with server (mainly to get IDs for new entries)
            this.deleted = [];
            await this.resyncEntries();
        } catch (err) {
            throw `Could not save changes. Error msg: ${err}`;
        }
    }
}