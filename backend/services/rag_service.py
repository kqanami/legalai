import os
import hashlib
import time
import chromadb
from chromadb.utils import embedding_functions
import logging

logger = logging.getLogger(__name__)

from config import settings


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
            
            # Use multilingual embedding model for better Russian/Kazakh semantic recall
            self.embedding_fn = embedding_functions.SentenceTransformerEmbeddingFunction(
                model_name="paraphrase-multilingual-MiniLM-L12-v2"
            )
            logger.info("Using multilingual ONNX embedding model (paraphrase-multilingual-MiniLM-L12-v2)")
            
            try:
                from sentence_transformers import CrossEncoder
                logger.info("Loading Multilingual Cross-Encoder (mmarco-mMiniLMv2-L12-H384-v1)...")
                self.cross_encoder = CrossEncoder("cross-encoder/mmarco-mMiniLMv2-L12-H384-v1", max_length=512)
            except Exception as ce_err:
                logger.warning(f"Could not load CrossEncoder: {ce_err}")
                self.cross_encoder = None
            
            # Use a new collection name since the embedding model changed
            self.collection = self.client.get_or_create_collection(
                name="kz_legal_v5_multilingual",
                embedding_function=self.embedding_fn
            )
            doc_count = self.collection.count()
            logger.info(f"ChromaDB initialized (local ONNX). Documents in collection: {doc_count}")
            
            # If empty, migrate data from old Gemini collection by re-ingesting raw text
            if doc_count == 0:
                logger.info("New local collection is empty. Will need to re-ingest documents.")
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
                
            logger.info(f"DEBUG RAG: Querying '{query}' with where={where_clause}...")
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results * 4,  # Fetch MORE for Cross-Encoder reranking
                where=where_clause
            )
            logger.info(f"DEBUG RAG: Results returned keys: {results.keys()}")
            
            if results and results.get("documents") and len(results["documents"]) > 0:
                retrieved_docs = results["documents"][0]
                logger.info(f"DEBUG RAG: Retrieved {len(retrieved_docs)} candidates before reranking.")
            else:
                retrieved_docs = []
                logger.warning(f"DEBUG RAG: Retrieved 0 docs for query: '{query}'. Results object: {results}")
                
            # STAGE B: Cross-Encoder Reranking
            if getattr(self, "cross_encoder", None) and retrieved_docs:
                logger.info(f"Reranking {len(retrieved_docs)} candidates with Cross-Encoder...")
                pairs = [[query, doc] for doc in retrieved_docs]
                scores = self.cross_encoder.predict(pairs)
                
                doc_scores = list(zip(retrieved_docs, scores))
                doc_scores.sort(key=lambda x: x[1], reverse=True)
                
                # Relaxing the threshold to -2.0 to avoid false negatives on complex legal phrasing
                top_docs = [doc for doc, score in doc_scores if score > -2.0]
                
                # If still empty, just fallback to the highest scored document
                if not top_docs:
                    logger.warning(f"All docs scored < -2.0 by CrossEncoder. Max score: {doc_scores[0][1] if doc_scores else 'N/A'}. Fallback to top 2 documents.")
                    docs = [doc for doc, score in doc_scores[:min(2, len(doc_scores))]]
                else:
                    logger.info(f"Cross-Encoder kept {len(top_docs)} relevant docs. Top score: {doc_scores[0][1]}")
                    docs = top_docs[:n_results]
            else:
                docs = retrieved_docs[:n_results]
                
            self._cache.set(query, n_results, category, docs)
            return docs
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
