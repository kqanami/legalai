"""
Full RAG Rebuild Script - Local ONNX Model Edition
===================================================
Scrapes ALL RK legislation from adilet.zan.kz and ingests into ChromaDB
using the local all-MiniLM-L6-v2 ONNX model.

NO rate limits, NO API keys needed, NO pauses required.
Expected time: ~10-15 minutes for all codes.
"""
import sys
import os
import re
import time
import requests
import hashlib
from bs4 import BeautifulSoup

os.environ["PYTHONIOENCODING"] = "utf-8"
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from chromadb.utils.embedding_functions import DefaultEmbeddingFunction
import chromadb

# ──────────────────────────────────────────────────────────────
# Configuration
# ──────────────────────────────────────────────────────────────
COLLECTION_NAME = "kz_legal_v5_multilingual"
DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "vector_store")
STORAGE_DIR = os.path.join(os.path.dirname(__file__), "..", "db", "legislation_md")
os.makedirs(STORAGE_DIR, exist_ok=True)

LEGISLATION_CATALOG = {
    "civil_general": {
        "title": "Гражданский кодекс РК (Общая часть)",
        "url": "https://adilet.zan.kz/rus/docs/K940001000_",
        "category": "civil",
        "file": "civil_general.md"
    },
    "civil_special": {
        "title": "Гражданский кодекс РК (Особенная часть)",
        "url": "https://adilet.zan.kz/rus/docs/K990000409_",
        "category": "civil",
        "file": "civil_special.md"
    },
    "labor": {
        "title": "Трудовой кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1500000414",
        "category": "labor",
        "file": "labor.md"
    },
    "tax": {
        "title": "Налоговый кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1700000120",
        "category": "tax",
        "file": "tax.md"
    },
    "administrative": {
        "title": "Кодекс РК об административных правонарушениях (КоАП)",
        "url": "https://adilet.zan.kz/rus/docs/K1400000272",
        "category": "administrative",
        "file": "administrative.md"
    },
    "criminal": {
        "title": "Уголовный кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1400000226",
        "category": "criminal",
        "file": "criminal.md"
    },
    "criminal_procedure": {
        "title": "Уголовно-процессуальный кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1400000231",
        "category": "criminal",
        "file": "criminal_procedure.md"
    },
    "civil_procedure": {
        "title": "Гражданский процессуальный кодекс РК (ГПК)",
        "url": "https://adilet.zan.kz/rus/docs/K1500000377",
        "category": "civil",
        "file": "civil_procedure.md"
    },
    "family": {
        "title": "Кодекс РК о браке (супружестве) и семье",
        "url": "https://adilet.zan.kz/rus/docs/K1100000518",
        "category": "family",
        "file": "family.md"
    },
    "entrepreneurial": {
        "title": "Предпринимательский кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1500000375",
        "category": "civil",
        "file": "entrepreneurial.md"
    },
    "law_too": {
        "title": "Закон РК о ТОО и товариществах",
        "url": "https://adilet.zan.kz/rus/docs/U980003900_",
        "category": "civil",
        "file": "law_too.md"
    },
    "law_bankruptcy": {
        "title": "Закон РК о реабилитации и банкротстве",
        "url": "https://adilet.zan.kz/rus/docs/Z1400000176",
        "category": "civil",
        "file": "law_bankruptcy.md"
    },
    "law_procurement": {
        "title": "Закон РК о государственных закупках",
        "url": "https://adilet.zan.kz/rus/docs/Z1500000434",
        "category": "civil",
        "file": "law_procurement.md"
    },
    "law_consumer": {
        "title": "Закон РК о защите прав потребителей",
        "url": "https://adilet.zan.kz/rus/docs/Z2200000000_",
        "category": "civil",
        "file": "law_consumer.md"
    },
    "constitution": {
        "title": "Конституция Республики Казахстан",
        "url": "https://adilet.zan.kz/rus/docs/K950001000_",
        "category": "civil",
        "file": "constitution.md"
    },
}

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    "Accept-Language": "ru-RU,ru;q=0.9"
}

# ──────────────────────────────────────────────────────────────
# Setup ChromaDB with local ONNX model
# ──────────────────────────────────────────────────────────────
print("🔧 Initializing local ChromaDB with multilingual ONNX embedding model...")
client = chromadb.PersistentClient(path=DB_PATH)

from chromadb.utils import embedding_functions
ef = embedding_functions.SentenceTransformerEmbeddingFunction(model_name="paraphrase-multilingual-MiniLM-L12-v2")

# Delete old collections
for old_name in ["kz_legal_v4_local", "kz_legal_knowledge_v3", "kz_legal_v5_multilingual"]:
    try:
        client.delete_collection(old_name)
        print(f"  🗑️  Deleted old collection: {old_name}")
    except:
        pass

collection = client.create_collection(name=COLLECTION_NAME, embedding_function=ef)
print(f"  ✅ Created fresh collection: {COLLECTION_NAME}")
print()


# ──────────────────────────────────────────────────────────────
# Scraping + Ingestion functions
# ──────────────────────────────────────────────────────────────
def scrape_url(url):
    """Fetch text from adilet.zan.kz"""
    import urllib3
    urllib3.disable_warnings()
    try:
        resp = requests.get(url, headers=HEADERS, verify=False, timeout=40)
        resp.raise_for_status()
        soup = BeautifulSoup(resp.text, "html.parser")
        content = (
            soup.find("div", class_="document-content") or
            soup.find("div", id="law_content") or
            soup.find("div", class_="law_content") or
            soup.find("body")
        )
        return content.get_text(separator="\n") if content else ""
    except Exception as e:
        print(f"  ❌ Scrape error: {e}")
        return ""


def parse_articles(text, source_title, source_url, category):
    """Parse articles from text and return (docs, metas, ids)"""
    pattern = r"(Статья\s+\d+|[0-9]+-бап)"
    matches = list(re.finditer(pattern, text))
    
    docs, metas, ids = [], [], []
    for idx, match in enumerate(matches):
        title = match.group(1).strip()
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        body = text[start:end].strip()
        full_text = f"[{source_title}]\n{title}\n{body}"[:6000]
        
        art_num_m = re.search(r"(\d+)", title)
        art_num = art_num_m.group(1) if art_num_m else str(idx + 1)
        content_hash = hashlib.md5(full_text.encode("utf-8")).hexdigest()[:8]
        doc_id = f"{category}_{art_num}_{content_hash}"
        
        docs.append(full_text)
        metas.append({
            "source": source_title,
            "article": art_num,
            "category": category,
            "url": source_url,
            "type": "scraped"
        })
        ids.append(doc_id)
    
    return docs, metas, ids


def ingest(docs, metas, ids, source_title):
    """Ingest docs into ChromaDB in batches - NO rate limit needed with local model!"""
    total = len(docs)
    if total == 0:
        print(f"  ⚠️  No articles parsed for {source_title}")
        return 0
    
    batch_size = 20  # Reduced batch size for ONNX local model
    for i in range(0, total, batch_size):
        b_docs = docs[i:i + batch_size]
        b_metas = metas[i:i + batch_size]
        b_ids = ids[i:i + batch_size]
        print(f"  ⏳ Embedding and upserting batch {i // batch_size + 1}... ({len(b_docs)} docs)", flush=True)
        collection.upsert(documents=b_docs, metadatas=b_metas, ids=b_ids)
        print(f"  ✅ Batch {i // batch_size + 1}/{(total - 1) // batch_size + 1} ingested ({len(b_docs)} docs)", flush=True)
    
    return total


# ──────────────────────────────────────────────────────────────
# Main ingestion loop
# ──────────────────────────────────────────────────────────────
total_ingested = 0
results = {}

for key, item in LEGISLATION_CATALOG.items():
    print(f"\n{'='*60}")
    print(f"📖 {item['title']}")
    print(f"🔗 {item['url']}")
    
    # Check if we have a cached local file first
    local_file = os.path.join(STORAGE_DIR, item["file"])
    
    if os.path.exists(local_file):
        print(f"  📂 Using cached local file: {item['file']}")
        with open(local_file, "r", encoding="utf-8") as f:
            text = f.read()
    else:
        print(f"  🌐 Scraping from web...")
        text = scrape_url(item["url"])
        if text:
            with open(local_file, "w", encoding="utf-8") as f:
                f.write(f"# {item['title']}\n\nИсточник: {item['url']}\n\n{text}")
            print(f"  💾 Saved to: {item['file']}")
        else:
            print(f"  ⚠️  Skipping {key} - could not fetch content")
            results[key] = 0
            continue
    
    docs, metas, ids = parse_articles(text, item["title"], item["url"], item["category"])
    print(f"  🔍 Parsed {len(docs)} articles")
    count = ingest(docs, metas, ids, item["title"])
    results[key] = count
    total_ingested += count
    print(f"  ✅ Done! {count} articles indexed")
    time.sleep(0.5)  # Tiny pause for adilet.zan.kz politeness

# ──────────────────────────────────────────────────────────────
# Summary
# ──────────────────────────────────────────────────────────────
print(f"\n{'='*60}")
print(f"🏁 FULL RAG REBUILD COMPLETE!")
print(f"{'='*60}")
print(f"📊 Total documents in collection: {collection.count()}")
print()
print("Results by code:")
for key, count in results.items():
    status = "✅" if count > 0 else "❌"
    print(f"  {status} {LEGISLATION_CATALOG[key]['title']}: {count} articles")
print(f"\n🎯 Grand total indexed: {total_ingested} articles")
