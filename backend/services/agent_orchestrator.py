import logging
import json
from typing import Dict, Any, List, AsyncGenerator

logger = logging.getLogger(__name__)

class LegalAgentOrchestrator:
    """
    Advanced Multi-Agent Legal Orchestrator.
    Orchestrates specialized steps: Query Generation -> Retrieval -> Analysis -> Verification.
    """
    def __init__(self, llm_service, rag_service, risk_scorer):
        self.llm = llm_service
        self.rag = rag_service
        self.scorer = risk_scorer

    async def generate_search_queries(self, query: str, history: List[Dict]) -> List[str]:
        """Agent that transforms user intent into optimized legal search queries."""
        prompt = f"""Преврати вопрос пользователя в 2-3 точных поисковых запроса для юридической базы данных Казахстана.
Используй только ключевые юридические термины (например: 'расторжение договора аренды', 'неустойка ГК РК').

ИСТОРИЯ ЧАТА:
{history[-2:] if history else "Нет истории"}

ВОПРОС: {query}

Верни только список строк через запятую.
"""
        try:
            # Using LLM directly for utility tasks
            response = await self.llm.chat(prompt, history=[], user_role="lawyer")
            content = response.get("content", query)
            # Simple parsing: split by comma and clean
            queries = [q.strip() for q in content.split(",") if q.strip()]
            return queries if queries else [query]
        except Exception as e:
            logger.error(f"Query generation failed: {e}")
            return [query]

    async def verify_legal_accuracy(self, query: str, response: str, context: str) -> str:
        """Verification agent to ensure the answer matches retrieved legal norms."""
        if not context:
            return response
            
        prompt = f"""Проверь ответ AI-юриста на соответствие предоставленным статьям закона Казахстана.
Если в ответе есть фактические ошибки относительно статей, исправь их. 
Если ответ верный, оставь его без изменений.

СТАТЬИ ЗАКОНА (RAG):
{context}

ОТВЕТ AI:
{response}

Верни исправленный текст или оригинал.
"""
        try:
            verified = await self.llm.chat(prompt, history=[], user_role="lawyer")
            return verified.get("content", response)
        except Exception as e:
            logger.error(f"Verification failed: {e}")
            return response

    async def process_contract_audit(self, contract_text: str) -> Dict[str, Any]:
        """Multi-agent workflow for contract auditing."""
        logger.info("Agent 1: Heuristic Risk Scorer running...")
        heuristic_risks = self.scorer.calculate_risk(contract_text)
        
        logger.info("Agent 2: Dynamic RAG Retrieval...")
        # Dynamic query for contract audit
        audit_queries = await self.generate_search_queries(f"Риски в договоре: {contract_text[:500]}", [])
        
        combined_context = ""
        for q in audit_queries[:2]:
            context = self.rag.get_context_string(q, n_results=2)
            if context:
                combined_context += context + "\n---\n"
        
        logger.info("Agent 3: LLM Audit Synthesizer...")
        enriched_prompt = f"""
ОБНАРУЖЕННЫЕ АЛГОРИТМИЧЕСКИЕ РИСКИ:
Уровень риска: {heuristic_risks['level'].upper()} (Score: {heuristic_risks['score']}/100)
Триггеры: {', '.join([t['trigger'] for t in heuristic_risks['found_triggers']])}

ИЗВЛЕЧЕННАЯ БАЗА ЗНАНИЙ (RAG):
{combined_context if combined_context else "Опирайся на общие нормы ГК РК."}

ТЕКСТ ДОГОВОРА:
{contract_text}
"""
        audit_results = await self.llm.audit_contract(enriched_prompt)
        return {
            **audit_results,
            "original_text": contract_text
        }

    async def process_chat_query(self, query: str, history: List[Dict], user_role: str) -> Dict[str, Any]:
        """Orchestrated chat query processing."""
        # 1. Dynamic Query Generation
        search_queries = await self.generate_search_queries(query, history)
        logger.info(f"Generated queries: {search_queries}")

        # 2. Multi-query Retrieval
        all_docs = []
        for sq in search_queries:
            docs = self.rag.search(sq, n_results=2)
            all_docs.extend(docs)
        
        # Deduplicate and format context
        unique_docs = list(set(all_docs))
        context = "\n\n---\n".join(unique_docs)
        
        # 3. Synthesis
        thought_process = f"Ищу в базе по запросам: {', '.join(search_queries)}. Найдено {len(unique_docs)} релевантных статей."
        
        if context:
            enriched_query = f"БАЗА ЗНАНИЙ РК:\n{context}\n\nВОПРОС:\n{query}"
        else:
            enriched_query = query
            
        response = await self.llm.chat(enriched_query, history, user_role)
        
        # 4. Verification (Optional but recommended for high-stakes)
        if context and user_role == "lawyer":
            response["content"] = await self.verify_legal_accuracy(query, response["content"], context)
            
        response["thought"] = thought_process
        return response

    async def process_chat_query_stream(self, query: str, history: List[Dict], user_role: str) -> AsyncGenerator[str, None]:
        """Stream version with orchestrated retrieval."""
        # For streaming, we do retrieval upfront to avoid interruption
        search_queries = await self.generate_search_queries(query, history)
        
        all_docs = []
        for sq in search_queries:
            docs = self.rag.search(sq, n_results=2)
            all_docs.extend(docs)
        
        context = "\n\n---\n".join(list(set(all_docs)))
        
        # Send initial "thought" as a hidden chunk or separate event if frontend supports it
        # Here we just log it and proceed to stream the main content
        logger.info(f"Streaming with queries: {search_queries}")
        
        if context:
            enriched_query = f"Используй эти статьи как основной источник:\n{context}\n\nВОПРОС: {query}"
        else:
            enriched_query = query
            
        async for chunk in self.llm.chat_stream(enriched_query, history, user_role):
            yield chunk

from services.gemini_service import gemini_service
from services.rag_service import rag_service
from services.legal_scoring import legal_scorer

orchestrator = LegalAgentOrchestrator(gemini_service, rag_service, legal_scorer)

