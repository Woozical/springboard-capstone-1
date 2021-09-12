function app(){

    const createDiv = document.getElementById('create-div');
    const createBtn = document.getElementById('create-btn');
    
    function toggleFormVisibility(){
        createDiv.hidden = !createDiv.hidden;
    }

    createBtn.addEventListener('click', toggleFormVisibility);

}

app();