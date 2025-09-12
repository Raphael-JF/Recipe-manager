const DB_PATH = '../recipes.db'


let DB;
let SQL;


// ----------------Helper Functions-----------------------------

function formatDescription(description) {
    if (!description) {
        return "Description vide.";
    } else {
        return description;
    }
}


// --------------------------------------------------------------

function oneIngredient(name, amount, unit) {
    table = document.getElementById("ingredients-table");
    

    const tr = document.createElement("tr");
    if(amount){
        tr.innerHTML = `
        <td class="ing_name"><span>${name}</span></td>
        <td class="amount"><span>${amount}</span></td>
    `;
        table.appendChild(tr);

    } else{
        tr.innerHTML = `
        <td class="ing_name"><span class="undotted">${name}</span></td>
        <td class="amount"><span>${amount}</span></td>
    `;
        table.prepend(tr);

    }
    


}

function load_ingredients(){
    // Charger les ingrédients dynamiquement
    const ingredientsRes = DB.exec(`
    SELECT ingredients.en_name, recipe_ingredients.original_amount, recipe_ingredients.unit
    FROM ingredients
    JOIN recipe_ingredients ON ingredients.id = recipe_ingredients.ingredient_id
    WHERE recipe_ingredients.recipe_id = ?`, [recipeId]);

    const table = document.getElementById("ingredients-table");
    table.innerHTML = "";

    if (ingredientsRes.length == 0){
        console.log("ingredientsRes is empty");
        document.getElementById("loading-spinner").style.display = "none";
        return;
    }

    ingredientsRes[0].values.forEach(([name, amount, unit]) => {oneIngredient(name, amount, unit)});

}

async function initDB() {
    document.getElementById("loading-spinner").style.display = "flex";
    document.getElementById("recipe-info").style.display = "none";
    document.getElementById("edit-button").style.display = "none";
    document.getElementById("recipe-ingredients-list").style.display = "none";


    SQL = await initSqlJs({
        locateFile: file => `../js/sql-wasm.wasm`
    });

    const response = await fetch(DB_PATH);
    const buffer = await response.arrayBuffer();
    DB = new SQL.Database(new Uint8Array(buffer));

    var recipeId = location.hash.substring(1);
    let title = DB.exec(`SELECT recipes.title FROM recipes WHERE recipes.id = ?`, [recipeId])[0].values[0];
    let description = DB.exec(`SELECT recipes.description FROM recipes WHERE recipes.id = ?`, [recipeId])[0].values[0];

    document.getElementById("recipe-title").innerText = title;
    document.title = title + " - Recette";
    document.getElementById("recipe-description").innerText = formatDescription(description);

    load_ingredients();

    document.getElementById("loading-spinner").style.display = "none";
    document.getElementById("recipe-info").style.display = "";
    document.getElementById("edit-button").style.display = "";
    document.getElementById("recipe-ingredients-list").style.display = "";


}

    // Fonction pour ajuster dynamiquement le contenu du before





initDB();