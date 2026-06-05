import sqlite3

db_path = 'backend/legal_assistant.db'

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("ALTER TABLE users ADD COLUMN api_key VARCHAR(100)")
except sqlite3.OperationalError as e:
    print("Column api_key might already exist:", e)

try:
    cursor.execute("ALTER TABLE users ADD COLUMN two_factor_enabled BOOLEAN DEFAULT 0")
except sqlite3.OperationalError as e:
    print("Column two_factor_enabled might already exist:", e)

conn.commit()
conn.close()
print("DB altered successfully.")
