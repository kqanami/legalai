import sys
import os

# Add backend to path so we can import services
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.rag_service import rag_service

def check_encoding():
    print("Checking database for corrupted text...")
    # Get first 5 documents
    res = rag_service.collection.get(limit=5)
    
    for i, doc in enumerate(res['documents']):
        print(f"Doc {i+1}: {repr(doc[:100])}")
        # Check if it contains weird characters
        if "" in doc:
            print("  WARNING: Found replacement character !")

if __name__ == "__main__":
    check_encoding()
