import os
import chromadb
from chromadb.utils import embedding_functions
import logging

logger = logging.getLogger(__name__)

from config import settings
from google import genai
import numpy as np

class LegalRAGService:
    def __init__(self):
        db_path = os.path.join(os.path.dirname(__file__), "..", "db", "vector_store")
        os.makedirs(db_path, exist_ok=True)
        
        try:
            self.client = chromadb.PersistentClient(path=db_path)
            # Устанавливаем API ключ в окружение
            os.environ["GEMINI_API_KEY"] = settings.GEMINI_API_KEY
            
            self.embedding_fn = embedding_functions.GoogleGenaiEmbeddingFunction(
                model_name="models/gemini-embedding-001"
            )
            
            self.collection = self.client.get_or_create_collection(
                name="kz_legal_knowledge_v3",
                embedding_function=self.embedding_fn
            )
            logger.info("ChromaDB with GoogleGenaiEmbeddingFunction (gemini-embedding-001) initialized.")
        except Exception as e:
            logger.error(f"Failed to initialize ChromaDB: {e}")
            self.client = None
            self.collection = None

    def add_documents(self, documents: list[str], metadatas: list[dict], ids: list[str]):
        """Adds curated legal texts to the vector database."""
        if not self.collection:
            return False
            
        try:
            self.collection.add(
                documents=documents,
                metadatas=metadatas,
                ids=ids
            )
            return True
        except Exception as e:
            logger.error(f"Error adding documents to RAG: {e}")
            return False

    def search(self, query: str, n_results: int = 3) -> list[str]:
        """Hybrid/Semantic search over the proprietary legal database."""
        if not self.collection:
            return []
            
        try:
            results = self.collection.query(
                query_texts=[query],
                n_results=n_results
            )
            
            if results and results.get("documents") and len(results["documents"]) > 0:
                # Return the list of matched document chunks
                return results["documents"][0]
            return []
        except Exception as e:
            logger.error(f"RAG search error: {e}")
            return []
            
    def get_context_string(self, query: str, n_results: int = 3) -> str:
        """Helper to get a formatted context string for the LLM."""
        docs = self.search(query, n_results)
        if not docs:
            return ""
        return "\n\n---\n".join(docs)

rag_service = LegalRAGService()
