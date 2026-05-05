import os
import chromadb
from chromadb.utils import embedding_functions
import logging

logger = logging.getLogger(__name__)

class LegalRAGService:
    """
    Proprietary RAG Vector Database for Legal Documents.
    This creates a huge moat by anchoring our AI to actual, curated Kazakhstan laws
    rather than relying on LLM hallucinations.
    """
    def __init__(self):
        # We store the vector database locally in a specific directory
        db_path = os.path.join(os.path.dirname(__file__), "..", "db", "vector_store")
        os.makedirs(db_path, exist_ok=True)
        
        try:
            self.client = chromadb.PersistentClient(path=db_path)
            # Default embedding function: sentence-transformers/all-MiniLM-L6-v2
            self.embedding_fn = embedding_functions.DefaultEmbeddingFunction()
            
            # Get or create the collection for KZ Legal Codes
            self.collection = self.client.get_or_create_collection(
                name="kz_legal_knowledge",
                embedding_function=self.embedding_fn
            )
            logger.info("ChromaDB LegalRAG initialized successfully.")
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
