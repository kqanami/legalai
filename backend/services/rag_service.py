import os
import hashlib
import time
import chromadb
from chromadb.utils import embedding_functions
import logging

logger = logging.getLogger(__name__)

from config import settings
from google import genai
import numpy as np

class CustomGeminiEmbeddingFunction(embedding_functions.EmbeddingFunction):
    """Custom embedding function using the new google-genai SDK with fail-fast daily quota handling."""
    def __init__(self, api_key: str, model_name: str = "models/gemini-embedding-001"):
        self.client = genai.Client(api_key=api_key)
        self.model_name = model_name

    def __call__(self, input: chromadb.api.types.Documents) -> chromadb.api.types.Embeddings:
        import time
        max_retries = 6
        backoff = 2
        for attempt in range(max_retries):
            try:
                response = self.client.models.embed_content(
                    model=self.model_name,
                    contents=input
                )
                return [e.values for e in response.embeddings]
            except Exception as e:
                err_str = str(e)
                # Check for daily/overall quota exhaustion limits (which sleeping won't fix)
                is_quota_limit = any(x in err_str.lower() for x in ["quota", "limit", "exceeded", "requestsperday"])
                
                if ("429" in err_str or "RESOURCE_EXHAUSTED" in err_str) and not is_quota_limit and attempt < max_retries - 1:
                    sleep_time = (backoff ** attempt) + 3
                    logger.warning(f"Gemini Embedding Rate Limit (429) encountered. Sleeping for {sleep_time}s before retry... (Attempt {attempt+1}/{max_retries})")
                    time.sleep(sleep_time)
                else:
                    if is_quota_limit:
                        logger.error(f"Gemini Embedding Daily Quota Exceeded. Failing fast to prevent backend lag: {e}")
                    else:
                        logger.error(f"Failed embedding content after {attempt+1} attempts: {e}")
                    raise e



class LRUCache:
    """Simple TTL-based LRU cache for RAG query results."""
    def __init__(self, max_size=256, ttl_seconds=600):
        self._cache = {}
        self._order = []
        self.max_size = max_size
        self.ttl = ttl_seconds

    def _make_key(self, query, n_results, category):
        raw = f"{query}|{n_results}|{category}"
        return hashlib.md5(raw.encode()).hexdigest()

    def get(self, query, n_results, category):
        key = self._make_key(query, n_results, category)
        entry = self._cache.get(key)
        if entry and (time.time() - entry["ts"]) < self.ttl:
            return entry["data"]
        if entry:
            del self._cache[key]
        return None

    def set(self, query, n_results, category, data):
        key = self._make_key(query, n_results, category)
        self._cache[key] = {"data": data, "ts": time.time()}
        if key not in self._order:
            self._order.append(key)
        # Evict oldest if over max
        while len(self._order) > self.max_size:
            old_key = self._order.pop(0)
            self._cache.pop(old_key, None)


class LegalRAGService:
    def __init__(self):
        db_path = os.path.join(os.path.dirname(__file__), "..", "db", "vector_store")
        os.makedirs(db_path, exist_ok=True)
        self._cache = LRUCache(max_size=256, ttl_seconds=600)
        
        try:
            self.client = chromadb.PersistentClient(path=db_path)
            # Set API key in environment
            os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
            
            self.embedding_fn = CustomGeminiEmbeddingFunction(
                api_key=settings.GEMINI_API_KEY,
                model_name="gemini-embedding-001"
            )
            
            self.collection = self.client.get_or_create_collection(
                name="kz_legal_knowledge_v3",
                embedding_function=self.embedding_fn
            )
            doc_count = self.collection.count()
            logger.info(f"ChromaDB initialized (gemini-embedding-001). Documents: {doc_count}")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self.client = None
            self.collection = None

    def add_documents(self, documents: list[str], metadatas: list[dict], ids: list[str]):
        """Adds curated legal texts to the vector database."""
        if not self.collection:
            return False
            
        try:
            self.collection.upsert(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            # Invalidate cache when new docs are added
            self._cache = LRUCache(max_size=256, ttl_seconds=600)
            return True
        except Exception as e:
            logger.error(f"Error adding documents to RAG: {e}")
            return False

    def _local_keyword_search(self, query: str, n_results: int = 3, category: str = None) -> list[str]:
        """Local keyword search fallback with optional Groq reranking when Gemini embedding fails."""
        logger.info("Executing Local Keyword Search Fallback...")
        if not self.collection:
            return []
            
        try:
            # Fetch all documents in collection
            data = self.collection.get()
            if not data or not data.get("documents"):
                return []
                
            documents = data["documents"]
            metadatas = data["metadatas"] if data.get("metadatas") else [None] * len(documents)
            
            # Simple keyword matching
            import re
            words = [w.lower() for w in re.findall(r'[а-яёәғқңөұүһіa-z0-9]+', query.lower()) if len(w) > 2]
            if not words:
                words = [query.lower()]
                
            scored_docs = []
            for doc, meta in zip(documents, metadatas):
                # Apply category filter if provided
                if category and meta and meta.get("category") != category:
                    continue
                    
                doc_lower = doc.lower()
                # Count matches
                score = sum(3 if w in doc_lower else 0 for w in words)
                # Boost for exact matches of multiple consecutive keywords
                for i in range(len(words) - 1):
                    phrase = f"{words[i]} {words[i+1]}"
                    if phrase in doc_lower:
                        score += 5
                
                if score > 0:
                    scored_docs.append((score, doc))
                    
            # Sort by score in descending order
            scored_docs.sort(key=lambda x: x[0], reverse=True)
            top_candidates = [doc for _, doc in scored_docs[:10]]
            
            if not top_candidates:
                return []
                
            # Use Groq to rerank if key is present
            from config import settings
            from groq import Groq
            
            if settings.GROQ_API_KEY:
                try:
                    logger.info("Using Groq llama-3.1-8b-instant to rerank local keyword search results...")
                    client = Groq(api_key=settings.GROQ_API_KEY, max_retries=0)
                    
                    articles_text = ""
                    for idx, doc in enumerate(top_candidates):
                        # Truncate each article context to prevent token limit exhaustion (429 TPM)
                        truncated_doc = doc[:800] + "..." if len(doc) > 800 else doc
                        articles_text += f"Статья {idx+1}:\n{truncated_doc}\n\n"
                        
                    prompt = f"""Ты — элитный юрист по законодательству Республики Казахстан.
Перед тобой список юридических статей из базы знаний:

{articles_text}

И вопрос пользователя: "{query}"

Выбери из списка 2-3 наиболее подходящие статьи, которые непосредственно помогают ответить на вопрос.
Верни строго только их номера через запятую (например: 1, 3). Ничего больше не пиши.
"""
                    resp = client.chat.completions.create(
                        model="llama-3.1-8b-instant",
                        messages=[
                            {"role": "system", "content": "Ты возвращаешь исключительно номера выбранных статей через запятую."},
                            {"role": "user", "content": prompt}
                        ],
                        temperature=0.1
                    )
                    content = resp.choices[0].message.content.strip()
                    # Parse indices
                    indices = [int(s.strip()) - 1 for s in re.findall(r'\d+', content)]
                    selected_docs = [top_candidates[i] for i in indices if 0 <= i < len(top_candidates)]
                    if selected_docs:
                        logger.info(f"Groq Reranker successfully chose {len(selected_docs)} documents.")
                        return selected_docs[:n_results]
                except Exception as e_groq:
                    logger.warning(f"Groq Reranker failed: {e_groq}. Returning raw top candidates.")
                    
            return top_candidates[:n_results]
        except Exception as e:
            logger.error(f"Error in local keyword search fallback: {e}")
            return []

    def search(self, query: str, n_results: int = 3, category: str = None) -> list[str]:
        """Hybrid/Semantic search over the proprietary legal database with caching."""
        if not self.collection:
            return []

        # Check cache first
        cached = self._cache.get(query, n_results, category)
        if cached is not None:
            logger.debug(f"RAG cache hit for: {query[:50]}...")
            return cached
            
        try:
            where_clause = None
            if category:
                where_clause = {"category": category}
                
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results * 2,  # Fetch more for re-ranking
                where=where_clause
            )
            
            if results and results.get("documents") and len(results["documents"]) > 0:
                docs = []
                for i in range(len(results["documents"][0])):
                    dist = results["distances"][0][i] if (results.get("distances") and len(results["distances"][0]) > i) else 0.0
                    sim = max(0.0, min(1.0, 1.0 - dist))
                    if sim >= getattr(settings, "RAG_MIN_SIMILARITY", 0.35):
                        docs.append(results["documents"][0][i])
                docs = docs[:n_results]
                self._cache.set(query, n_results, category, docs)
                return docs
            
            self._cache.set(query, n_results, category, [])
            return []
        except Exception as e:
            logger.error(f"RAG search error: {e}. Falling back to local/Groq search.")
            fallback_docs = self._local_keyword_search(query, n_results, category)
            self._cache.set(query, n_results, category, fallback_docs)
            return fallback_docs
            
    def get_context_string(self, query: str, n_results: int = 3, category: str = None) -> str:
        """Helper to get a formatted context string for the LLM."""
        docs = self.search(query, n_results, category)
        if not docs:
            return ""
        return "\n\n---\n".join(docs)

    def get_stats(self) -> dict:
        """Return RAG collection statistics."""
        if not self.collection:
            return {"status": "offline", "documents": 0}
        try:
            count = self.collection.count()
            return {"status": "online", "documents": count, "cache_size": len(self._cache._cache)}
        except Exception:
            return {"status": "error", "documents": 0}

rag_service = LegalRAGService()
