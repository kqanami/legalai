import sys, os
sys.path.insert(0, os.path.dirname(__file__))

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')

from services.gemini_service import gemini_service

history = [
    {"role": "user", "content": "Привет, у меня проблема с арендой квартиры в Алматы."},
    {"role": "assistant", "content": "Здравствуйте! Опишите вашу проблему с арендой квартиры в Алматы подробнее, чтобы я мог дать точную юридическую рекомендацию. [REFS][{\"title\": \"ГК РК\", \"url\": \"https://adilet.zan.kz\", \"articles\": \"ст. 540\"}][SEGMENT]b2c[SUGGESTIONS][\"Каковы мои риски?\", \"Как расторгнуть договор?\", \"Какая неустойка?\"]"}
]

query = "В договоре написано, что арендодатель может выселить меня за 3 дня."

# Check _clean_history_content
clean_assistant = gemini_service._clean_history_content(history[1]["content"])
print("CLEAN ASSISTANT:")
print(clean_assistant)

# Check _build_messages
messages = gemini_service._build_messages(query, history, user_role="citizen")
print("\nBUILT MESSAGES FOR GROQ:")
for idx, msg in enumerate(messages):
    print(f"{idx}: {msg['role']} -> {msg['content']}")
