const DB_PATH = '../recipes.db'
const itemsPerPage = 80

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
    // DB.exec("INSERT INTO recipes(title) VALUES('tg') ")
    updateResultsRows("")
}

function displayResultsRows() {
    const start = (currentPage - 1) * itemsPerPage;
    const end = currentPage * itemsPerPage;

    let toDisplay = currentResultsRows.slice(start, end)
    const listElement = document.getElementById('recipes-list');
    listElement.innerHTML = "";
    for (let i = 0; i < toDisplay.length && i < itemsPerPage; i++) {
        let li = document.createElement('li');
        
        // Insert recipe information into the 'li' element.
        li.className = "recipe_suggestion"
        li.innerText = toDisplay[i][1];
        
        
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
    pageInput = document.getElementById("page-input")
    pageInput.max = Math.ceil(currentResultsRows.length / itemsPerPage);
    pageInput.value = 1
    pageInput.style.width = (pageInput.value.length + 3) + 'ch'
    handle_page_input()
    document.getElementById("page-input-container").children[2].textContent = "/ "+document.getElementById('page-input').max

    displayResultsRows()

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
    pageInput.style.width = (pageInput.value.length + 3) + 'ch'
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




document.getElementById('search-bar').addEventListener("keyup", function(event) {
    event.preventDefault(); 
    updateResultsRows(event.target.value)
});

// inputElement.addEventListener('keydown', function(event) {
//   // Si la touche appuyée est le Enter (code de clavier : 13)
//   if (event.which === 13 || event.keyCode === 13) {
//     // Empêcher le navigateur d'effectuer l'action par défaut
//     event.preventDefault();
    
//     // Perdre le focus à l'élément input
//     this.blur();
//   }
// });

document.getElementById('page-input').addEventListener("keyup", (e) => {
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

initDB();