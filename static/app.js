class Entry {
    constructor({id, title, description, image, url, entry_type, rating, sequence}, state){
        this.id = id;
        this.title = title;
        this.description = description;
        this.image= image ? image : '/static/images/globe.png';
        this.url = url;
        this.type = entry_type;
        this.rating = rating;
        this.sequence = sequence;
        this.state = state;
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

    refreshEntryList(){
        const entriesList = document.getElementById('repo-entry-list');
        entriesList.innerHTML = '';
        for (let entry of this.entries){
            const li = document.createElement('li');
            // check type in future
            li.innerHTML = `
            <img src="${entry.image}" width=100 height=100>
            <a href="${entry.url}">${entry.title}</a>
            `
            entriesList.append(li);
        }
    }

    addDivider(){
        const data = {
            id : -1, title: 'New Divider', description: null,
            image: null, url: null, type: 'divider',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
    }

    addTextBox(){
        const data = {
            id : -1, title: 'New Text Box', description: '...',
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
            id: -1, title: metaData.title ? metaData.title : metaData.site_name, description: metaData.description,
            image: metaData.image, url: url, type: 'link',
            rating: null, sequence: this.entries.length
        };
        this.entries.push(new Entry(data, 'NEW'));
        this.refreshEntryList();
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
        
        const form = document.getElementById('new-link-form');
        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const link = form.new.value;
            repo.addLink(link);
            form.new.value = '';
        });
    }
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

function populateEntryList(entries){
    for (let entry of entries){
        const list = document.getElementById('link-list');
        const entryDiv = document.createElement('div');

        const link = document.createElement('a');
        link.innerText = entry.title;
        link.href = entry.url;
        entryDiv.append(link);
        list.append(entryDiv);
    }
}

