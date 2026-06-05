import sys
import os
import re

# FORCE UTF-8 for everything
os.environ["PYTHONIOENCODING"] = "utf-8"

# Add backend to path so we can import services
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.rag_service import rag_service

def reset_and_reingest():
    print("Resetting RAG Collection v4 (local ONNX)...")
    try:
        rag_service.client.delete_collection("kz_legal_v4_local")
        print("Deleted old collection kz_legal_v4_local.")
    except:
        pass
    try:
        rag_service.client.delete_collection("kz_legal_knowledge_v3")
        print("Deleted old Gemini collection kz_legal_knowledge_v3.")
    except:
        pass
    
    # Re-create collection with local embedding function
    from chromadb.utils import embedding_functions
    local_ef = embedding_functions.DefaultEmbeddingFunction()
    rag_service.collection = rag_service.client.create_collection(
        name="kz_legal_v4_local",
        embedding_function=local_ef
    )
    
    # Ingest Narcotics Articles first
    print("Ingesting priority narcotics articles...")
    narc_docs = [
        "Статья 296. Незаконное обращение с наркотическими средствами, психотропными веществами, их аналогами без цели сбыта. Хранение гашиша без цели сбыта наказывается штрафом или арестом. В особо крупном размере - от 3 до 7 лет лишения свободы.",
        "Статья 297. Незаконные изготовление, переработка, приобретение, хранение, перевозка в целях сбыта, пересылка либо сбыт наркотических средств, психотропных веществ, их аналогов."
    ]
    rag_service.add_documents(narc_docs, [{"source": "Уголовный кодекс РК", "article": "296"}, {"source": "Уголовный кодекс РК", "article": "297"}], ["uk_rk_296_pri", "uk_rk_297_pri"])

    # Paths to the fetched files
    base_dir = os.path.join(os.path.dirname(__file__), "..", "db", "legislation_md")
    files = [
        (os.path.join(base_dir, "labor.md"), "Трудовой кодекс РК", "labor"),
        (os.path.join(base_dir, "criminal.md"), "Уголовный кодекс РК", "criminal"),
        (os.path.join(base_dir, "civil.md"), "Гражданский кодекс РК (Общая часть)", "civil"),
        (os.path.join(base_dir, "tax.md"), "Налоговый кодекс РК", "tax"),
    ]
    
    pattern = r"(?:https?://[^\s]+)?(Статья\s+\d+[\.\s][^.\n]+)"
    
    for file_path, source_name, category in files:
        if not os.path.exists(file_path):
            continue
            
        print(f"Ingesting {source_name}...")
        with open(file_path, "r", encoding="utf-8") as f:
            content = f.read()
            
        sections = re.split(pattern, content)
        docs, metas, ids = [], [], []
        
        for i in range(1, len(sections), 2):
            title = sections[i].strip()
            body = sections[i+1].strip() if (i+1) < len(sections) else ""
            full_text = f"{title}\n{body}"[:8000]
            
            art_num_match = re.search(r"Статья\s+(\d+)", title)
            art_num = art_num_match.group(1) if art_num_match else "unknown"
            
            doc_id = f"{category}_{art_num}_{hash(title) % 10000}"
            docs.append(full_text)
            metas.append({"source": source_name, "article": art_num, "category": category})
            ids.append(doc_id)
            
        # Batch add
        import time
        batch_size = 20
        total_batches = (len(docs) - 1) // batch_size + 1
        for j in range(0, len(docs), batch_size):
            print(f"Adding batch {j//batch_size + 1}/{total_batches} ({len(docs[j:j+batch_size])} docs)...")
            rag_service.add_documents(docs[j:j+batch_size], metas[j:j+batch_size], ids[j:j+batch_size])
            print("Sleeping 20 seconds to respect Gemini API rate limits...")
            time.sleep(20)
            
    print("RAG Reset & Re-ingest COMPLETE.")

if __name__ == "__main__":
    reset_and_reingest()
