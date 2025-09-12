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

function getIngredientNames(recipeId) {
    let res = DB.exec(`SELECT ingredients.en_name FROM ingredients JOIN recipe_ingredients ON ingredients.id = recipe_ingredients.ingredient_id JOIN recipes ON recipes.id = recipe_ingredients.recipe_id WHERE recipes.id = ?`, [recipeId]);
    res[0].values = res[0].values.slice(0, 8);
    return res[0].values.map(ing => `<span title="${ing}" class="ingredient-tag">${ing}</span>`).join("");
}

// -------------Backend-----------------
async function initDB() {
    document.getElementById("loading-spinner").style.display = "flex";
    document.getElementById("pagination").style.display = "none";
    document.getElementById("recipes-list").style.display = "none";
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
    const ul = document.getElementById('recipes-list');
    ul.innerHTML = "";
    for (let i = 0; i < toDisplay.length && i < itemsPerPage; i++) {
        let li = document.createElement('li');
        let recipeId = toDisplay[i][0];
        let title = toDisplay[i][1];
        let description = toDisplay[i][2];
        let grade = toDisplay[i][3];
        let language = toDisplay[i][4];
        li.dataset.dbId = recipeId;
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
                ${getIngredientNames(recipeId)}
            </div>
        `;
        // Insert recipe information into the 'li' element.
        li.className = "recipe_suggestion"
        
        
        ul.appendChild(li);
    }
}

function updateResultsRows(query) {

    // first, show loading spinner
    document.getElementById("loading-spinner").style.display = "flex";
    document.getElementById("pagination").style.display = "none";
    document.getElementById("recipes-list").style.display = "none";

    let res = DB.exec("SELECT id, title, description, grade, language FROM recipes");

    currentResultsRows = res[0].values;
    for (let i = currentResultsRows.length-1; i>=0; i--){
        row = currentResultsRows[i];

        if (!row[1].toLowerCase().includes(query.toLowerCase())) {

            currentResultsRows.splice(i,1)
        }
    }
    document.getElementById("page-input").value = 1;
    resizePageInput()
    displayResultsRows()

    //finally, hide loading spinner
    document.getElementById("loading-spinner").style.display = "none";
    document.getElementById("pagination").style.display = "grid";
    document.getElementById("recipes-list").style.display = "flex";

}

function resizePageInput(){
    const pageInput = document.getElementById("page-input");
    const pageInputDenominator = document.getElementById("page-input-denominator");

    pageInput.max = Math.ceil(currentResultsRows.length / itemsPerPage);
    

    // longueur en caractères
    const lenMax = pageInput.max.toString().length;   // nb de chiffres dans le dénominateur
    const lenVal = pageInput.value.toString().length; // nb de chiffres dans la valeur

    // padding à droite = dénominateur + un peu de marge
    const paddingCh = lenMax + 1.5; 
    pageInput.style.paddingRight = paddingCh + "ch";

    // largeur totale = valeur + "/" + dénominateur + marge
    const widthCh = lenVal + 2 + lenMax + 3; 
    pageInput.style.width = widthCh + "ch";

    // texte du dénominateur
    pageInputDenominator.textContent = "/" + pageInput.max;
}

function handlePageInput(){
    let pageInput = document.getElementById('page-input')
    pageInput.value = Math.max(1,Math.min(pageInput.max, pageInput.value))

    resizePageInput()

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


document.getElementById('search-bar').addEventListener("keyup", (e) => {
    //key code for enter
 if (e.key === 'Enter') {
    
    e.preventDefault();
    e.target.blur();
 }
})

document.getElementById('page-input').addEventListener("keydown", (e) => {
    //key code for enter
    resizePageInput()
    if (e.key === 'Enter') {
    e.preventDefault();
    e.target.blur();
    }
})

document.getElementById('next').addEventListener("click", (e) => {
    if (e.target.className != "page-btn-disabled"){
        let pageInput = document.getElementById('page-input')
        pageInput.value++
        handlePageInput()
        displayResultsRows()
    }
})

document.getElementById('prev').addEventListener("click", (e) => {
    if (e.target.className != "page-btn-disabled"){
        let pageInput = document.getElementById('page-input')
        pageInput.value--
        handlePageInput()
        displayResultsRows()
    }
})

document.getElementById("recipes-list").addEventListener("click", (e) => {
    // if <li> element is clicked or one of its children excluding .ingredients-tags
    if (!e.target.matches("li") && !e.target.closest("li")){
        return;
    }
    if (e.target.matches(".ingredient-tag")) {
        return
    }
});

initDB();