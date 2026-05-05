import os
import sys
# Add backend to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from config import settings
from google import genai

def test_embed():
    print(f"API KEY: {settings.GEMINI_API_KEY[:5]}...")
    client = genai.Client(api_key=settings.GEMINI_API_KEY)
    res = client.models.embed_content(
        model="text-embedding-004",
        contents=["Привет мир"],
        config={'task_type': 'retrieval_document'}
    )
    print(f"Embedding success: {len(res.embeddings[0].values)} dimensions")

if __name__ == "__main__":
    test_embed()
