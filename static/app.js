class Entry {
    constructor({id, title, description, image, url, entry_type, rating, sequence}){
        this.id = id;
        this.title = title;
        this.description = description;
        this.image= image;
        this.url = url;
        this.type = entry_type;
        this.rating = rating;
        this.sequence = sequence;
    }
    
}

class Repo {
    constructor({title, description, entries, access_key}){
        this.title = title;
        this.description = description;
        this.accessKey = access_key;
        this.entries = [];
        for (let entry of entries){
            this.entries.push(
                new Entry(entry)
            );
        }
        // sort entries on sequence
        this.entries.sort( (a, b) => a.sequence - b.sequence );
    }

    displayInfo(){
        document.getElementById('repo-title').innerText = this.title;
        document.getElementById('repo-desc').innerText = this.description;
        const entriesList = document.getElementById('repo-entry-list');
        for (let entry of this.entries){
            const li = document.createElement('li');
            // check type in future
            li.innerHTML = `
            <a href="${entry.url}">${entry.title}</a>
            `
            entriesList.append(li);
        }
    }
}

async function loadRepoData(accessKey){
    let res
    try {
        res = await axios.get(`/api/repo/${accessKey}`);
    } catch (err) {
        if (err.response.status === 401) {
            // do auth
            displayAuthForm(accessKey);
        }
    }
    const repo = new Repo(res.data);
    console.log(repo);
    repo.displayInfo();
}

async function displayAuthForm(accessKey){
    const content = document.getElementById('content');
    content.innerHTML = `
    <form id="auth-form">
        <label for="pw">Please enter the pass phrase</label> <br>
        <input type="password" name="pw" id="pw">
        <p id="auth-result"></p>
        <button>Submit</button>
    </form>
    `;

    const form = document.getElementById('auth-form');

    form.addEventListener('submit', async function(e){
        e.preventDefault();
        data = {
            'pass_phrase' : form.pw.value
        }
        try {
            await axios.post(`/api/repo/${accessKey}/auth`, data=data);
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