import sqlite3

conn = sqlite3.connect('d:/agent1.0/ai-legal-kz/backend/legal_assistant.db')
c = conn.cursor()

print("SESSIONS:")
c.execute("SELECT id, title, segment, created_at FROM chat_sessions")
for row in c.fetchall():
    print(row)

print("\nMESSAGES:")
c.execute("SELECT id, session_id, role, content, created_at FROM chat_messages")
for row in c.fetchall():
    print(f"Msg {row[0]}: Session {row[1]}, {row[2]} -> {repr(row[3])[:100]} (created: {row[4]})")
conn.close()
