import csv
import sqlite3
import statistics
import deep_translator
from pint import UnitRegistry

# Connect to the SQLite database (or create if not exists)
conn = sqlite3.connect('densites.db')
c = conn.cursor()
ureg = UnitRegistry()
Q_ = ureg.Quantity
# Create table
c.execute('''DROP TABLE IF EXISTS densites''')
c.execute('''CREATE TABLE densites
             (name_en TEXT, density REAL)''')



#-----------------------------------------------
#-----------------------------------------------
# FIRST CSV (en g/mL)
#-----------------------------------------------
#-----------------------------------------------

# Open the CSV file and read it row by row
with open('densites-1.csv', 'r') as f:
    reader = csv.reader(f, delimiter=";")
    for row in reader:
        if(row[1] == row[2] == row[3] == row[4] == ""):
            continue

        name_en = row[0]
        if row[1] != "":
            str_density = row[1]
        elif row[2] != "":
            str_density = row[2]
        else:
            continue
        
        if "-" in str_density:
            temp = str_density.split("-")
            density = statistics.mean(map(float, temp))
        else:
            density = float(str_density.replace(",","."))
        density = density * (ureg.gram / ureg.milliliter)
        density = density.to("kg/m^3")
        print(name_en,":",density.m)
        c.execute("INSERT INTO densites VALUES (?, ?)", [name_en.lower(), density.m])

#-----------------------------------------------
#-----------------------------------------------
# SECOND CSV
#-----------------------------------------------
#-----------------------------------------------
with open('densites-2.csv', 'r') as f:
    reader = csv.reader(f, delimiter=";")
    for row in reader:
        name_fr = row[0]
        str_volume = row[1].replace(" ","")
        str_mass = row[2].replace(" ","")
        translator = deep_translator.GoogleTranslator("french","english")
        name_en = translator.translate(name_fr)

        # Check if name_en already exists in the database
        c.execute("SELECT density FROM densites WHERE name_en=?", [name_en])
        result = c.fetchone()

        # If it does, calculate mean of new and old densities
        if result:
            old_density = result[0]
            new_density = Q_(str_mass) / Q_(str_volume)
            new_density = new_density.to("kg/m^3")
            updated_density = (old_density + new_density.m) / 2

            # Update the database with the mean density
            c.execute("UPDATE densites SET density=? WHERE name_en=?", (updated_density, name_en))
            print("UPDATE :",name_fr,"->",name_en,":",updated_density)

        else:
            density = Q_(str_mass) / Q_(str_volume)
            density = density.to("kg/m^3")
            print(name_fr,"->",name_en,":",density.m)

            # Insert new row into database
            c.execute("INSERT INTO densites VALUES  (?, ?)", [name_en.lower(), density.m])

# Save changes and close connection
conn.commit()
conn.close()