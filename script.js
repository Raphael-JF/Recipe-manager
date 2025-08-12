let db;
let SQL;

async function initDB() {
    SQL = await initSqlJs({
        locateFile: file => `sql-wasm.wasm`
    });

    const response = await fetch('recipes.db');
    const buffer = await response.arrayBuffer();
    db = new SQL.Database(new Uint8Array(buffer));

    afficherListe();
}

function afficherListe() {
    const ul = document.getElementById('liste');
    ul.innerHTML = '';

    const res = db.exec("SELECT id, title FROM recipes ORDER BY title ASC");

    if (res.length > 0) {
        const rows = res[0].values;
        rows.forEach(([id, titre]) => {
            const li = document.createElement('li');
            li.textContent = titre;
            li.addEventListener('click', () => editRecette(id));
            ul.appendChild(li);
        });
    }
}

function editRecette(id) {
    const res = db.exec(`SELECT id, title, original_ingredients_list, instructions_list FROM recipes WHERE id=${id}`);
    if (res.length === 0) return;

    const [recette] = res[0].values;
    document.getElementById('titre').value = recette[1];
    document.getElementById('ingredients').value = recette[2];
    document.getElementById('instructions').value = recette[3];

    document.getElementById('form-edit').onsubmit = (e) => {
        e.preventDefault();
        updateRecette(id);
    };

    document.getElementById('recette-list').classList.add('hidden');
    document.getElementById('recette-edit').classList.remove('hidden');
}

function updateRecette(id) {
    const titre = document.getElementById('titre').value;
    const ingredients = document.getElementById('ingredients').value;
    const instructions = document.getElementById('instructions').value;

    db.run(`UPDATE recettes SET titre = ?, ingredients = ?, instructions = ? WHERE id = ?`,
        [titre, ingredients, instructions, id]);

    afficherListe();
    document.getElementById('recette-list').classList.remove('hidden');
    document.getElementById('recette-edit').classList.add('hidden');
}

document.getElementById('retour').addEventListener('click', () => {
    document.getElementById('recette-list').classList.remove('hidden');
    document.getElementById('recette-edit').classList.add('hidden');
});

document.getElementById('ajouter-recette').addEventListener('click', () => {
    const titre = prompt("Titre de la recette ?");
    if (!titre) return;

    db.run(`INSERT INTO recettes (titre, ingredients, instructions) VALUES (?, '', '')`, [titre]);
    afficherListe();
});

document.getElementById('download-db').addEventListener('click', () => {
    const data = db.export();
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'recettes.db';
    a.click();
});

initDB();
