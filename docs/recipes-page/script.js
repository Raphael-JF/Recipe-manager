const DB_PATH = '../recipes.db'
const itemsPerPage = 10

let currentPage = 1;
let currentResultsRows = [];

let DB;
let SQL;



async function initDB() {
    SQL = await initSqlJs({
        locateFile: file => `../js/sql-wasm.wasm`
    });

    const response = await fetch(DB_PATH);
    const buffer = await response.arrayBuffer();
    DB = new SQL.Database(new Uint8Array(buffer));
    updateResultsRows("")
}

function displayResultsRows() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;

    let toDisplay = currentResultsRows.slice(start, end)
    const listElement = document.getElementById('liste');
    listElement.innerHTML = "";
    for (let i = 0; i < toDisplay.length && i < itemsPerPage; i++) {
        let li = document.createElement('li');
        
        // Insert recipe information into the 'li' element.
        li.className = "recipe_suggestion"
        li.innerText = toDisplay[i][1];
        
         // Add a click event to open the full recipe.
        li.addEventListener('click', function() { editrecipe(toDisplay[i][0]); });
        
        listElement.appendChild(li);
    }
}

function updateResultsRows(query) {
    
    let res = DB.exec("SELECT id, title FROM recipes");

    currentResultsRows = res[0].values;
    for (let i = currentResultsRows.length-1; i>=0; i--){
        row = currentResultsRows[i];

        if (!row[1].toLowerCase().includes(query.toLowerCase())) {

            currentResultsRows.splice(i,1)
        }
    }
    console.log(currentResultsRows.length)
    document.getElementById("page-input").max = Math.ceil(currentResultsRows.length / itemsPerPage);
    document.getElementById("page-input").value = 1
    handle_page_input()
    document.getElementById("page-input-denominator").textContent = "/ "+document.getElementById('page-input').max

    displayResultsRows()

}

function editrecipe(id) {
    const res = DB.exec(`SELECT id, title, original_ingredients_list, instructions_list FROM recipes WHERE id=${id}`);
    if (res.length === 0) return;

    const [recipe] = res[0].values;
    document.getElementById('titre').value = recipe[1];
    document.getElementById('ingredients').value = recipe[2];
    document.getElementById('instructions').value = recipe[3];

    document.getElementById('form-edit').onsubmit = (e) => {
        e.preventDefault();
        updaterecipe(id);
    };

    document.getElementById('recipe-list').classList.add('hidden');
    document.getElementById('recipe-edit').classList.remove('hidden');
}

function updaterecipe(id) {
    const titre = document.getElementById('titre').value;
    const ingredients = document.getElementById('ingredients').value;
    const instructions = document.getElementById('instructions').value;

    DB.run(`UPDATE recipes SET title = ?, original_ingredients_list = ?, instructions_list = ? WHERE id = ?`,
        [titre, ingredients, instructions, id]);

    afficherListe();
    document.getElementById('recipe-list').classList.remove('hidden');
    document.getElementById('recipe-edit').classList.add('hidden');
}

function handle_page_input(){
    let pageInput = document.getElementById('page-input')
    pageInput.value = Math.max(1,Math.min(pageInput.max, pageInput.value))
    currentPage = pageInput.value
    if (pageInput.value == 1){
        document.getElementById('prev').className = "page-btn-disabled"
    }
    else{
        document.getElementById('prev').className = "page-btn"

    }
    if (pageInput.value == pageInput.max){
        document.getElementById('next').className = "page-btn-disabled"
    }
    else{
        document.getElementById('next').className = "page-btn"
    }
}




document.getElementById('search-bar').addEventListener("change", function(event) {
    event.preventDefault(); 
    updateResultsRows(event.target.value)
});

document.getElementById('page-input').addEventListener("change", (e) => {
    if (e.target.className != "page-btn-disabled"){
        handle_page_input()
        displayResultsRows()
    }
})

document.getElementById('next').addEventListener("click", (e) => {
    if (e.target.className != "page-btn-disabled"){
        let pageInput = document.getElementById('page-input')
        pageInput.value++
        handle_page_input()
        displayResultsRows()
    }
})

document.getElementById('prev').addEventListener("click", (e) => {
    if (e.target.className != "page-btn-disabled"){
        let pageInput = document.getElementById('page-input')
        pageInput.value--
        handle_page_input()
        displayResultsRows()
    }
})

document.getElementById('retour').addEventListener('click', () => {
    document.getElementById('recipe-list').classList.remove('hidden');
    document.getElementById('recipe-edit').classList.add('hidden');
});

document.getElementById('ajouter-recipe').addEventListener('click', () => {
    const titre = prompt("Titre de la recipe ?");
    if (!titre) return;

    DB.run(`INSERT INTO recipes (titre, ingredients, instructions) VALUES (?, '', '')`, [titre]);
    afficherListe();
});

document.getElementById('download-db').addEventListener('click', () => {
    const data = DB.export();
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = DB_PATH;
    a.click();
});



initDB();