import sys

with open('backend/services/gemini_service.py', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('или если пользователь ПРЯМО и недвусмысленно просит нанять адвоката/юриста ("хочу нанять юриста", "мне нужен адвокат для суда").', 'или если пользователь просит нанять адвоката/юриста ("хочу нанять юриста", "мне нужен адвокат", "нужна помощь адвоката"). В ЭТОМ СЛУЧАЕ ТЫ ОБЯЗАН ВЕРНУТЬ "needed": true!')

with open('backend/services/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(content)
