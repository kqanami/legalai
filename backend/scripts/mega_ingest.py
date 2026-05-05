import sys
import os
import re

# Add backend to path so we can import services
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.rag_service import rag_service

def parse_and_ingest(file_path, source_name, category):
    if not os.path.exists(file_path):
        print(f"File not found: {file_path}")
        return

    with open(file_path, "r", encoding="utf-8") as f:
        content = f.read()

    # Regex to find articles like "Статья 1. Основные понятия..."
    # Adilet markdown often has URLs before the title, like "https://adilet.zan.kz/...Статья 1."
    pattern = r"(?:https?://[^\s]+)?(Статья\s+\d+[\.\s][^.\n]+)"
    
    # Split content by the pattern, but keep the titles
    sections = re.split(pattern, content)
    
    docs = []
    metas = []
    ids = []
    
    # sections[0] is the intro text before Article 1
    # Then sections[1] is Title 1, sections[2] is Content 1, etc.
    for i in range(1, len(sections), 2):
        title = sections[i].strip()
        body = sections[i+1].strip() if (i+1) < len(sections) else ""
        
        full_text = f"{title}\n{body}"
        # Limit size to prevent vector DB issues
        full_text = full_text[:8000] 
        
        art_num_match = re.search(r"Статья\s+(\d+)", title)
        art_num = art_num_match.group(1) if art_num_match else "unknown"
        
        doc_id = f"{category}_{art_num}_{hash(title) % 10000}"
        
        docs.append(full_text)
        metas.append({
            "source": source_name,
            "article": art_num,
            "category": category
        })
        ids.append(doc_id)

    print(f"Parsed {len(docs)} articles from {source_name}.")
    
    # Batch add to avoid memory spikes
    batch_size = 50
    for j in range(0, len(docs), batch_size):
        success = rag_service.add_documents(
            docs[j:j+batch_size], 
            metas[j:j+batch_size], 
            ids[j:j+batch_size]
        )
        if success:
            print(f"  Ingested batch {j//batch_size + 1}/{(len(docs)-1)//batch_size + 1}")
        else:
            print(f"  Failed batch {j//batch_size + 1}")

if __name__ == "__main__":
    # Example for Tax Code
    nk_path = r"C:\Users\Yura\.gemini\antigravity\brain\4bbe363b-bc11-49ea-8f10-a72ff01a10c5\.system_generated\steps\357\content.md"
    parse_and_ingest(nk_path, "Налоговый кодекс РК", "tax")
