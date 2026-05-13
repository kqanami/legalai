
import sqlite3
import os

def set_premium():
    db_path = "backend/legal_assistant.db"
    if not os.path.exists(db_path):
        print(f"База данных {db_path} не найдена.")
        return

    phone = "+77476523346"
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    try:
        # Проверяем, существует ли пользователь
        cursor.execute("SELECT id, name, role, plan FROM users WHERE phone = ?", (phone,))
        user = cursor.fetchone()
        
        if not user:
            print(f"Пользователь с номером {phone} не найден. Сначала зарегистрируйтесь в приложении.")
            return

        print(f"Найден пользователь: {user[1]} (ID: {user[0]})")
        print(f"Текущий статус: Роль={user[2]}, Тариф={user[3]}")

        # Обновляем
        cursor.execute(
            "UPDATE users SET role = 'admin', plan = 'business' WHERE phone = ?", 
            (phone,)
        )
        conn.commit()
        
        print(f"УСПЕХ! Пользователю {phone} выданы права ADMIN и тариф BUSINESS.")
    except Exception as e:
        print(f"Ошибка: {e}")
    finally:
        conn.close()

if __name__ == "__main__":
    set_premium()
