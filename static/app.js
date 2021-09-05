class Entry {
    
}

class Repo {
    // fetchEntries(){
    //     this
    // }
}

async function loadRepoData(accessKey){
    // const res = await axios.get(`/api/repo/${accessKey}`);
    // populateEntryList(res.data.entries);
    const res = await axios.get('/repo/create')
    console.log(res.data)
    const list = document.getElementById('link-list');
    list.innerHTML = res.data;
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