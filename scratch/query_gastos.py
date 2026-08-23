import sqlite3
import os

db_path = os.path.expandvars(r'%APPDATA%\inventario-baupi\data.db')
conn = sqlite3.connect(db_path)
c = conn.cursor()

print("--- Count of gastos ---")
c.execute("SELECT COUNT(*) FROM gastos")
print(c.fetchone()[0])

print("--- Sample gastos ---")
c.execute("SELECT * FROM gastos LIMIT 5")
for r in c.fetchall():
    print(r)
