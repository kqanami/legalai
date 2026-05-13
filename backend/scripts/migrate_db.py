
import sqlite3
import os

def migrate():
    db_path = "backend/legal_assistant.db"
    if not os.path.exists(db_path):
        print(f"База данных по пути {db_path} не найдена. Возможно, она внутри Docker или имеет другое имя.")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        print("Добавляем колонку 'plan' в таблицу 'users'...")
        cursor.execute("ALTER TABLE users ADD COLUMN plan TEXT DEFAULT 'freemium'")
        conn.commit()
        print("Успешно! Колонка 'plan' добавлена.")
    except sqlite3.OperationalError as e:
        if "duplicate column name" in str(e):
            print("Колонка 'plan' уже существует.")
        else:
            print(f"Ошибка при миграции: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    migrate()
