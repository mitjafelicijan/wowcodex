import mysql.connector

BUILD_ID = "4222"

connection = mysql.connector.connect(
        host="127.0.0.1",
        user="root",
        password="",
        database="vanilla",
        ssl_disabled=True
)

assert connection.is_connected(), "Failed to connect to MySQL database"

file = open("out/SpellNameByID.lua", "w")
file.write("SpellNameByID = {\n")

cursor = connection.cursor()
cursor.execute(f"SELECT entry, name FROM `spell_template` WHERE `build` = {BUILD_ID}")
results = cursor.fetchall()
for row in results:
    spell_name = row[1].replace('"', '\\"')
    file.write(f'   [{row[0]}] = "{spell_name}",\n')
    print(row)

file.write("}")
file.close()

cursor.close()
connection.close()
