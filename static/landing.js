function app(){
    const createDiv = document.getElementById('create-div');
    const createBtn = document.getElementById('create-btn');
    const createForm = document.getElementById('create-form');
    
    function toggleFormVisibility(){
        createDiv.hidden = !createDiv.hidden;
    }

    createBtn.addEventListener('click', toggleFormVisibility);

    createForm.addEventListener('submit', async function(e){
        e.preventDefault();
        const formData = new FormData(e.target);
        await axios.post('/api/repo/create', data=formData, {headers : {'Content-Type' : 'multipart/form-data'}})
        .then( function(response){
            window.location = `/repo/${response.data.created}`
        })
        .catch( function(error){
            const errors = error.response.data.errors
            for (let errorField of Object.keys(errors)){
                const errorDisplay = document.getElementById(`${errorField}-errors`);
                errorDisplay.innerText = errors[errorField][0];
            }
        });
    });

    createForm.show_pw.addEventListener('click', function(e){
        if (e.target.checked){
            createForm.pass_phrase.setAttribute('type', 'text');
        } else {
            createForm.pass_phrase.setAttribute('type', 'password');
        }
    })
}

app();