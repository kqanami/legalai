"""
RAG Diagnostic Script v2 — без загрузки embedding model
Просто читает ChromaDB напрямую через get(), не через query()
"""
import sys, os
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

import chromadb

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "db", "vector_store")
COLLECTION_NAME = "kz_legal_v5_multilingual"

print("=" * 60)
print("RAG DIAGNOSTIC REPORT v2")
print("=" * 60)

client = chromadb.PersistentClient(path=DB_PATH)

# ── 1. Список всех коллекций ──
collections = client.list_collections()
print(f"\n[1] ALL COLLECTIONS ({len(collections)} total):")
for c in collections:
    print(f"    - '{c.name}'")

# ── 2. Открываем без embedding function (только для чтения метаданных) ──
print(f"\n[2] COLLECTION STATS:")
try:
    # Получаем коллекцию без embedding_function — только для get/count
    col = client.get_collection(name=COLLECTION_NAME)
    count = col.count()
    print(f"    Total documents: {count}")
except Exception as e:
    print(f"    ERROR: {e}")
    sys.exit(1)

if count == 0:
    print("\n[!] COLLECTION IS EMPTY — нужно запустить полный ре-индекс!")
    sys.exit(0)

# ── 3. Peek — первые 5 документов ──
print("\n[3] SAMPLE DOCS (first 5):")
sample = col.get(limit=5, include=["documents", "metadatas"])
for i, (doc, meta) in enumerate(zip(sample["documents"], sample["metadatas"])):
    print(f"\n    --- Doc {i+1} ---")
    print(f"    meta={meta}")
    print(f"    text[:200]: {doc[:200].strip()}...")

# ── 4. Уникальные категории ──
print("\n[4] UNIQUE CATEGORIES:")
all_meta = col.get(include=["metadatas"])
cats = {}
for m in all_meta["metadatas"]:
    cat = m.get("category", "NONE")
    cats[cat] = cats.get(cat, 0) + 1
for cat, cnt in sorted(cats.items()):
    print(f"    '{cat}': {cnt} docs")

# ── 5. Трудовые статьи specifically ──
print("\n[5] LABOR DOCUMENTS (первые 5):")
try:
    labor_docs = col.get(where={"category": "labor"}, limit=5, include=["documents", "metadatas"])
    if not labor_docs["documents"]:
        print("    ZERO LABOR DOCS — category filter not working or no labor data!")
    else:
        print(f"    Found {len(labor_docs['documents'])} (showing first 5):")
        for i, (doc, meta) in enumerate(zip(labor_docs["documents"], labor_docs["metadatas"])):
            print(f"\n    Labor doc {i+1}: art={meta.get('article')}, source={meta.get('source')}")
            print(f"    text[:300]: {doc[:300].strip()}...")
except Exception as e:
    print(f"    ERROR with category filter: {e}")

# ── 6. Ключевое слово "увольнение" через keyword search ──
print("\n[6] KEYWORD CHECK — docs containing 'увольнение':")
try:
    all_docs = col.get(include=["documents", "metadatas"])
    hits = [(doc, meta) for doc, meta in zip(all_docs["documents"], all_docs["metadatas"])
            if "увольнен" in doc.lower()]
    print(f"    Found {len(hits)} docs containing 'увольнен'")
    for i, (doc, meta) in enumerate(hits[:3]):
        print(f"\n    --- Hit {i+1} ---")
        print(f"    meta: {meta}")
        print(f"    text[:300]: {doc[:300].strip()}...")
except Exception as e:
    print(f"    ERROR: {e}")

# ── 7. Ключевое слово "заработная плата" ──
print("\n[7] KEYWORD CHECK — docs containing 'заработная плата':")
try:
    hits2 = [(doc, meta) for doc, meta in zip(all_docs["documents"], all_docs["metadatas"])
             if "заработн" in doc.lower()]
    print(f"    Found {len(hits2)} docs containing 'заработн'")
    for i, (doc, meta) in enumerate(hits2[:2]):
        print(f"    Hit {i+1}: art={meta.get('article')}, cat={meta.get('category')}")
        print(f"    text[:200]: {doc[:200].strip()}...")
except Exception as e:
    print(f"    ERROR: {e}")

print("\n" + "=" * 60)
print("DIAGNOSTIC COMPLETE")
print("=" * 60)
