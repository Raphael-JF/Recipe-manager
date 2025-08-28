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

async function initDB() {
    document.getElementById("loading-spinner").style.display = "flex";
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
    document.getElementById("recipe-description").innerText = formatDescription(description);

    // Charger les ingrédients dynamiquement
    const ingredientsRes = DB.exec(`
        SELECT ingredients.en_name, recipe_ingredients.amount, recipe_ingredients.unit
        FROM ingredients
        JOIN recipe_ingredients ON ingredients.id = recipe_ingredients.ingredient_id
        WHERE recipe_ingredients.recipe_id = ?`, [recipeId]);

    const table = document.getElementById("recipe-ingredients");
    table.innerHTML = "";

    if (ingredientsRes.length == 0){
        document.getElementById("loading-spinner").style.display = "none";
        return;
    }

    ingredientsRes[0].values.forEach(([name, amount, unit]) => {
        const tr = document.createElement("tr");

        const tdName = document.createElement("td");
        tdName.className = "ing_name";
        const spanName = document.createElement("span");
        spanName.innerText = name;
        tdName.appendChild(spanName);

        const tdAmount = document.createElement("td");
        tdAmount.className = "amount";
        const spanAmount = document.createElement("span");
        float_amount = parseFloat(amount);
        spanAmount.innerText = (isNaN(float_amount) ? amount : float_amount.toFixed(2)) + unit;
        tdAmount.appendChild(spanAmount);

        tr.appendChild(tdName);
        tr.appendChild(tdAmount);
        table.appendChild(tr);
    });

    document.getElementById("loading-spinner").style.display = "none";

}

    // Fonction pour ajuster dynamiquement le contenu du before





initDB();