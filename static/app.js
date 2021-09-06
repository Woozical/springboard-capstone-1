const NOIMG = '/static/images/globe.png';

class Entry {
    static idGen = Entry.generateID();
    constructor({id, title, description, image, url, entry_type, rating, sequence}, state){
        this.id = id ? id : Entry.idGen.next().value;
        this.title = title;
        this.description = description;
        this.image= image ? image : NOIMG;
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
    
}

class Repo {
    constructor({title, description, entries, access_key}){
        this.title = title ;
        this.description = description;
        this.accessKey = access_key;
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
    // TO DO: Move the HTML markup into a method on Entry
    refreshEntryList(){
        const entriesList = document.getElementById('repo-entry-list');
        entriesList.innerHTML = '';

        this.entries.forEach(
            (entry, index) => {
                const li = document.createElement('li');
                li.id = `entry_${index}`;
                // TO DO: check type in future
                li.innerHTML = `
                <button id="edit_${index}">Edit</button>
                <img src="${entry.image}" width=100 height=100>
                <a href="${entry.url}">${entry.title}</a>
                `
                entriesList.append(li);
            }
        );
    }

    refreshEntryMarkup(entryIndex){
        const entryLI = document.getElementById(`entry_${entryIndex}`);
        const entry = this.entries[entryIndex];
        entryLI.innerHTML = `
        <button id="edit_${entryIndex}">Edit</button>
        <img src="${entry.image}" width=100 height=100>
        <a href="${entry.url}">${entry.title}</a>
        `
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
        // scrape data on URL through server
        // TO-DO: make sure outgoing url has schema
        const scrape = await axios.get('/api/scrape', { params: {'url' : encodeURIComponent(url)} });
        const metaData = scrape.data.data;
        console.log(metaData);
        // TO-DO: 
        const data = {
            id: null, title: metaData.title ? metaData.title : metaData.site_name, description: metaData.description,
            image: metaData.image, url: url, entry_type: 'link',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
        console.log(this);
    }
}

async function loadRepoData(accessKey){
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
        
        // Set up event listeners
        document.getElementById('btn-new-divide').addEventListener('click', () => {repo.addDivider()});
        document.getElementById('btn-new-tbox').addEventListener('click', () => {repo.addTextBox()});
        
        const newLinkForm = document.getElementById('new-link-form');
        newLinkForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const link = newLinkForm.new.value;
            repo.addLink(link);
            newLinkForm.new.value = '';
        });

        const entriesList = document.getElementById('repo-entry-list');
        entriesList.addEventListener('click', function(e){
            if (e.target.tagName === 'BUTTON'){
                // show edit form
                document.getElementById('entry-edit').hidden = false;
                const entryIndex = e.target.id.split('_')[1];
                loadEntryIntoEditForm(repo, entryIndex);
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