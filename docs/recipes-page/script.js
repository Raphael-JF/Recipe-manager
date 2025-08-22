const DB_PATH = '../recipes.db'
const itemsPerPage = 10

let currentPage = 1;
let currentResultsRows = [];

function checkOverflow(el){
   var curOverflow = el.style.overflow;

   if ( !curOverflow || curOverflow === "visible" )
      el.style.overflow = "hidden";

   var isOverflowing = el.clientWidth < el.scrollWidth 
      || el.clientHeight < el.scrollHeight;

   el.style.overflow = curOverflow;

   return isOverflowing;
}

let DB;
let SQL;

// -----------------Helpers-----------------------------
function intToStars(int){
    return "★".repeat(int) + "☆".repeat(5 - int);
}

function formatLanguage(lang) {
    if (lang == "english"){
        return "EN"
    }else if(lang == "french"){
        return "FR"
    }else{
        return lang.toUpperCase()
    }
}

function formatDescription(description) {
    if (!description) {
        return "Description vide.";
    } else {
        return description;
    }
}

function getIngredientNames(recipe_id) {
    let res = DB.exec(`SELECT ingredients.en_name FROM ingredients JOIN recipe_ingredients ON ingredients.id = recipe_ingredients.ingredient_id JOIN recipes ON recipes.id = recipe_ingredients.recipe_id WHERE recipes.id = ?`, [recipe_id]);
    res[0].values = res[0].values.slice(0, 8);
    return res[0].values.map(ing => `<span class="ingredient-tag">${ing}</span>`).join("");
}

// -------------Backend-----------------
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
    const ul = document.getElementById('recipes-list');
    ul.innerHTML = "";
    for (let i = 0; i < toDisplay.length && i < itemsPerPage; i++) {
        let li = document.createElement('li');
        let recipe_id = toDisplay[i][0];
        let title = toDisplay[i][1];
        let description = toDisplay[i][2];
        let grade = toDisplay[i][3];
        let language = toDisplay[i][4];
        li.innerHTML = `
            <div class="title-lang">
                <h2 class="title">${title}</h2>
                <span class="language">${formatLanguage(language)}</span>
            </div>
            <div class="description-grade">
                <p class="description">${formatDescription(description)}</p>
                <span class="grade">${intToStars(grade)}</span>
            </div>
            <div class="ingredients">
                ${getIngredientNames(recipe_id)}
            </div>
        `;
        // Insert recipe information into the 'li' element.
        li.className = "recipe_suggestion"
        
        
        ul.appendChild(li);
    }
}

function updateResultsRows(query) {

    let res = DB.exec("SELECT id, title, description, grade, language FROM recipes");

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
    window.scrollTo(0, 0);
}


document.getElementById('search-bar').addEventListener("keyup", function(event) {
    event.preventDefault(); 
    updateResultsRows(event.target.value)
});

document.getElementById('page-input').addEventListener("keyup", (e) => {
    //key code for enter
 if (e.key === 'Enter') {
   e.preventDefault();
   e.target.blur();
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