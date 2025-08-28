
from fractions import Fraction
import sqlite3
import pint
import shutil

from tqdm import tqdm

from ingredient_parser._common import UREG
from ingredient_parser.dataclasses import IngredientAmount, CompositeIngredientAmount
from ingredient_parser import parse_ingredient #https://pypi.org/project/ingredient-parser-nlp/

local_ureg = pint.UnitRegistry()
local_ureg.define('stick = 4 * ounce = [mass] = sticks')
local_ureg.define('pinch = teaspoon/16 = [volume] = pinches')
local_ureg.define('drop = teaspoon/96 = [volume] = drops')



def remove_recipe(recipe_id):
    c.execute("DELETE FROM recipes WHERE id = ?;",[recipe_id])

def format_ingredient(ingr):
    """Formats ingredient names.""" 

    ingr = ingr.lower()
    ingr = ingr.replace("*","")
    ingr = ingr.replace(" half ","1/2")


    # replacing the '"' by proper 'inches' terms
    i = 0
    while True:
        occ = ingr.find('"', i)
        if occ == -1:
            break
        if occ > 0 and ingr[occ-1].isdigit():
            ingr = ingr[:occ] + " inches" + ingr[occ+1:]
            i = occ + len(" inches") 
        else:
            i = occ + 1  
    return ingr

def hack_unit(amount: IngredientAmount, new_unit:str):
    """
    Hack into the 'IngredientAmount' amount to convert it into a custom unit.
    This has to be done in a subtle way because two 'UnitRegistery' objects cannot interfere and the one which is used in 'ingredient_parser' is not affectable by users.
    """
    if amount.quantity == "":
        amount.quantity = Fraction(1,1)
    if amount.quantity_max == "":
        amount.quantity_max = Fraction(1,1)

    q = local_ureg.Quantity(amount.quantity, amount.unit)
    q_max = local_ureg.Quantity(amount.quantity_max, amount.unit)
    
    q_converted = q.to(new_unit)
    q_max_converted = q_max.to(new_unit)

    amount.quantity = q_converted.magnitude
    amount.quantity_max = q_max_converted.magnitude
    amount.unit = UREG.Unit(new_unit)
    amount.text = (f"{float(q_converted.magnitude):g} " + f"{q_converted.units:P}")

def handle_unit_str(amount: IngredientAmount):
    """
    Manage to avoid 'amount.unit' being a string
    """
    if amount.unit in ["pinch", "pinches"]:
        hack_unit(amount, "teaspoon")
    elif amount.unit in ["stick", "sticks"]:
        hack_unit(amount, "ounce")
    elif amount.unit == ["drop", "drops"]:
        hack_unit(amount, "teaspoon")


#-----------------------------------------------
#-----------------------------------------------
# FIRST PART : Registering ingredients into the database
#-----------------------------------------------
#-----------------------------------------------



def first_phase():
    conn2 = sqlite3.connect('densites/densites.db')
    c2 = conn2.cursor()

    c.execute("DROP TABLE IF EXISTS ingredients")
    c.execute("CREATE TABLE ingredients (id INTEGER PRIMARY KEY, fr_name TEXT, en_name TEXT, density REAL);")

    # Fetch all rows from the recipes table
    c.execute("SELECT * FROM recipes")
    recipes_rows = c.fetchall()
    # Normalize ingredients and print them
    for recipe_row in tqdm(recipes_rows):
        raw_ingredients_list = eval(recipe_row[2])
        for raw_ing in raw_ingredients_list:
            formatted_raw_ing = format_ingredient(raw_ing)
            obj = parse_ingredient(formatted_raw_ing,
                                    separate_names=False, 
                                    string_units=False,
                                    foundation_foods=False)
            
            # just testing smtg
            # if obj.amount != []:
            #     if isinstance(obj.amount[0], CompositeIngredientAmount):
            #         for a in obj.amount[0].amounts:
            #             if isinstance(a.unit,str):
            #                 print(formatted_raw_ing, "|", a.unit)
            #     if isinstance(obj.amount[0], IngredientAmount):
            #         if isinstance(obj.amount[0].unit,str):
            #             print(formatted_raw_ing, "|",obj.amount[0].unit)

            if obj.name == [] or recipe_row[1] == "":
                remove_recipe(recipe_row[0])
            else:
                ingredient = obj.name[0].text
                c.execute("SELECT * FROM ingredients WHERE en_name=?", [ingredient])
                data = c.fetchone()
                if not data:
                    c2.execute("SELECT density FROM densites WHERE name_en=?", [ingredient])
                    density = c2.fetchone()
                    if density != None:
                        c.execute("INSERT INTO ingredients(en_name, density) VALUES (?, ?)", [ingredient, float(density[0])])
                    else:
                        c.execute("INSERT INTO ingredients(en_name, density) VALUES (?, ?)", [ingredient, None])


#-----------------------------------------------
#-----------------------------------------------
# SECOND PART : Registering ingredients uses into the database
#-----------------------------------------------
#-----------------------------------------------

class CustomError(Exception):
    """Classe d'exception personnalisée"""
    pass

def second_phase():
    c.execute("DROP TABLE IF EXISTS recipe_ingredients")
    c.execute("""
CREATE TABLE recipe_ingredients(
    id INTEGER PRIMARY KEY, 
    ingredient_id INT, 
    recipe_id INT, 
    original_amount TEXT,
    original_sentence TEXT,
    amount TEXT,
    unit TEXT,
    FOREIGN KEY (ingredient_id) REFERENCES ingredients(id), 
    FOREIGN KEY (recipe_id) REFERENCES recipes(id)
);"""
    )

    c.execute("SELECT * FROM recipes")
    recipes_rows = c.fetchall()
    # Normalize ingredients and print them
    for recipe_row in tqdm(recipes_rows):
        raw_ingredients_list = eval(recipe_row[2])
        recipe_id = recipe_row[0]
        for raw_ing in raw_ingredients_list:
            # try:
            formatted_raw_ing = format_ingredient(raw_ing)
            obj = parse_ingredient(formatted_raw_ing,
                                    separate_names=False, 
                                    string_units=False,
                                    foundation_foods=False)
            try:
                #--------------------Changing annoying units-----------------
                if isinstance(obj.amount[0], CompositeIngredientAmount):
                    for a in obj.amount[0].amounts:
                        if isinstance(a.unit,str)  and not isinstance(a.quantity,str):
                            handle_unit_str(a)
                elif isinstance(obj.amount[0], IngredientAmount):
                    if isinstance(obj.amount[0].unit,str) and not isinstance(obj.amount[0].quantity,str):
                        handle_unit_str(obj.amount[0])
                #-----------------------------------------------------------

                #------------------Extracting fields for the database-----------------
                if isinstance(obj.amount[0], CompositeIngredientAmount):
                    try:
                        if obj.amount[0].amounts[0].unit.is_compatible_with(UREG.liter):
                            db_amount = str(float(obj.amount[0].convert_to("mL").magnitude))
                            db_unit = "mL"
                        elif obj.amount[0].amounts[0].unit.is_compatible_with(UREG.gram):
                            db_amount = str(float(obj.amount[0].convert_to("g").magnitude))
                            db_unit = "g"
                    except:
                        db_amount = obj.amount[0].text
                        db_unit = ""

                elif isinstance(obj.amount[0], IngredientAmount):
                    # supposing that all the amounts are the same dimension. Indeed it would be weird to have "1 cup + 2g flour"
                    if isinstance(obj.amount[0].quantity, str):
                        db_amount = obj.amount[0].text
                        db_unit = ""
                    elif isinstance(obj.amount[0].unit, str):
                        if isinstance(obj.amount[0].quantity, str):
                            if obj.amount[0].quantity != obj.amount[0].quantity_max:
                                db_amount = obj.amount[0].quantity+"-"+ obj.amount[0].quantity_max
                            else:
                                db_amount = obj.amount[0].quantity
                        else:
                            if obj.amount[0].quantity != obj.amount[0].quantity_max:
                                db_amount = str(float(obj.amount[0].quantity))+"-"+ str(float(obj.amount[0].quantity_max))
                            else:
                                db_amount = str(float(obj.amount[0].quantity))
                        db_unit = obj.amount[0].unit
                    elif obj.amount[0].unit.is_compatible_with(UREG.liter):
                            
                        db_amount = str(float(obj.amount[0].convert_to("mL").quantity))
                        db_unit = "mL"
                    elif obj.amount[0].unit.is_compatible_with(UREG.gram):
                        db_amount = str(float(obj.amount[0].convert_to("g").quantity))
                        db_unit = "g"
            except IndexError:
                # cannot find any amount : there is no one. (e.g. : 'fine salt' where no amount is given)

                db_amount = ""
                db_unit = ""
            except Exception as e:
                print(obj)
                raise e
            
            # print(formatted_raw_ing,"au final:", f"'{db_amount}'", f"'{db_unit}'")

           
            ingredient = obj.name[0].text
            c.execute("SELECT id FROM ingredients WHERE en_name=?", [ingredient])
            ingredient_id = c.fetchone()
            if obj.amount != []:
                obj_amount = obj.amount[0].text
            else:
                obj_amount = ""
            c.execute("""
                        INSERT INTO recipe_ingredients(
                        ingredient_id, 
                        recipe_id, 
                        original_amount,
                        original_sentence,
                        amount,
                        unit) 
                        VALUES  (?,?,?,?,?,?)
                    """, [ingredient_id[0], recipe_id, obj_amount, obj.sentence, db_amount, db_unit])



if __name__ == "__main__":

    print("Preliminary phase")

    # copying the .db file and adding the field "origin"
    shutil.copyfile("13k-recipes-original.db", "recipes.db")

    conn = sqlite3.connect('recipes.db')
    c = conn.cursor()

    c.execute("ALTER TABLE recipes RENAME Title TO title;")
    c.execute("ALTER TABLE recipes RENAME Ingredients TO original_ingredients_list;")
    c.execute("ALTER TABLE recipes RENAME Instructions TO instructions_list;")
    c.execute("ALTER TABLE recipes ADD COLUMN description TEXT;")
    c.execute("ALTER TABLE recipes ADD COLUMN language TEXT;")
    c.execute("ALTER TABLE recipes ADD COLUMN grade INT;")
    c.execute("UPDATE recipes SET language = 'english' WHERE 1=1")
    c.execute("UPDATE recipes SET description = '' WHERE 1=1")
    c.execute("UPDATE recipes SET grade = 0 WHERE 1=1")





    print("Phase 1")
    first_phase()

    print("Phase 2")
    second_phase()

    conn.commit()
    conn.close()