import sys

with open('backend/services/gemini_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

old_str = '{"needed": <true или false>, "reason": "Обоснование, почему нужен юрист", "category": "Уголовное право / Гражданское право и т.д."}'
new_str = '{"needed": true, "reason": "Обоснование, почему нужен юрист", "category": "Уголовное право"}'

content = content.replace(old_str, new_str)

with open('backend/services/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
