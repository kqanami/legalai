import sys
sys.path.append('backend')
from services.gemini_service import gemini_service

content = 'test [REFS] [{"title": "t", "url": "", "articles": "", "snippet": "s"}]'
print(gemini_service._parse_chat_response(content))
