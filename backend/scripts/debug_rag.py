import sys
import os

# Add backend to path so we can import services
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.rag_service import rag_service

def debug_search(query):
    print(f"Searching for: '{query}'")
    results = rag_service.collection.query(
        query_texts=[query],
        n_results=5
    )
    
    if not results['documents'][0]:
        print("NO RESULTS FOUND.")
        return

    for i, doc in enumerate(results['documents'][0]):
        meta = results['metadatas'][0][i]
        print(f"--- Result {i+1} ---")
        print(f"Source: {meta.get('source')}, Art: {meta.get('article')}")
        print(f"Snippet: {doc[:200]}...")

if __name__ == "__main__":
    debug_search("гашиш")
    print("\n" + "="*20 + "\n")
    debug_search("наркотические средства")
