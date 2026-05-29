import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "..", "legal_assistant.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

try:
    cursor.execute("PRAGMA foreign_keys=off;")
    
    # Create new table
    cursor.execute("""
    CREATE TABLE users_new (
        id INTEGER NOT NULL PRIMARY KEY, 
        name VARCHAR(255) NOT NULL, 
        phone VARCHAR(20), 
        email VARCHAR(255), 
        password_hash VARCHAR(255),
        auth_provider VARCHAR(50) DEFAULT 'local',
        role VARCHAR(20), 
        plan TEXT DEFAULT 'freemium', 
        city VARCHAR(100), 
        created_at DATETIME
    );
    """)

    # Copy data
    cursor.execute("""
    INSERT INTO users_new (id, name, phone, email, role, plan, city, created_at)
    SELECT id, name, phone, email, role, plan, city, created_at FROM users;
    """)

    # Drop old table
    cursor.execute("DROP TABLE users;")

    # Rename new table
    cursor.execute("ALTER TABLE users_new RENAME TO users;")

    # Recreate indices
    cursor.execute("CREATE UNIQUE INDEX ix_users_phone ON users (phone);")
    cursor.execute("CREATE UNIQUE INDEX ix_users_email ON users (email);")
    cursor.execute("CREATE INDEX ix_users_id ON users (id);")

    conn.commit()
    print("Database migrated successfully.")
except Exception as e:
    conn.rollback()
    print(f"Error: {e}")
finally:
    cursor.execute("PRAGMA foreign_keys=on;")
    conn.close()
