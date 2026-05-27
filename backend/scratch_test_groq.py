import sys, os
from groq import Groq

sys.path.insert(0, os.path.dirname(__file__))
from config import settings

print(f"GROQ_API_KEY: {settings.GROQ_API_KEY[:10]}...")
print(f"GROQ_MODEL_FAST: {settings.GROQ_MODEL_FAST}")

try:
    client = Groq(api_key=settings.GROQ_API_KEY)
    chat_completion = client.chat.completions.create(
        messages=[
            {
                "role": "user",
                "content": "Hello, who are you?",
            }
        ],
        model=settings.GROQ_MODEL_FAST,
    )
    print("RESPONSE:")
    print(chat_completion.choices[0].message.content)
except Exception as e:
    print("GROQ ERROR:")
    print(e)
