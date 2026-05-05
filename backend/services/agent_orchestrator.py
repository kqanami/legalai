import logging
from typing import Dict, Any, List

logger = logging.getLogger(__name__)

class LegalAgentOrchestrator:
    """
    Multi-Agent Legal Orchestrator (Proprietary IP).
    Instead of passing a prompt directly to an LLM, we orchestrate multiple 
    internal "agents" (Classifier -> Retrieval -> Analyzer -> Synthesizer)
    to create a defensible, complex AI pipeline.
    """
    def __init__(self, llm_service, rag_service, risk_scorer):
        self.llm = llm_service
        self.rag = rag_service
        self.scorer = risk_scorer

    async def process_contract_audit(self, contract_text: str) -> Dict[str, Any]:
        """
        Multi-agent workflow for contract auditing.
        1. Heuristic Risk Agent (Rule-based)
        2. RAG Agent (Retrieves relevant legal norms)
        3. LLM Audit Agent (Synthesizes)
        """
        logger.info("Agent 1: Heuristic Risk Scorer running...")
        heuristic_risks = self.scorer.calculate_risk(contract_text)
        
        logger.info("Agent 2: RAG Retrieval running...")
        # Search our local DB for laws related to "расторжение", "штраф", "неустойка"
        context_laws = self.rag.get_context_string("штраф неустойка расторжение договора форс-мажор", n_results=3)
        
        logger.info("Agent 3: LLM Synthesizer running...")
        # Combine heuristic findings and RAG context to force the LLM into a highly accurate response
        enriched_prompt = f"""
ОБНАРУЖЕННЫЕ АЛГОРИТМИЧЕСКИЕ РИСКИ (ПРОПРИЕТАРНАЯ СИСТЕМА):
Уровень риска: {heuristic_risks['level'].upper()} (Score: {heuristic_risks['score']}/100)
Триггеры: {', '.join([t['trigger'] for t in heuristic_risks['found_triggers']])}

ИЗВЛЕЧЕННАЯ БАЗА ЗНАНИЙ (RAG):
{context_laws if context_laws else "База знаний пока не заполнена. Опирайся на общие нормы ГК РК."}

ТЕКСТ ДОГОВОРА:
{contract_text}

---
Используй эти алгоритмические подсказки и базу знаний, чтобы сформировать итоговый JSON-отчет по аудиту.
"""
        # Call the existing LLM service but with enriched, orchestrated data
        if self.llm.groq_client:
            return await self.llm._audit_groq(enriched_prompt)
        elif self.llm.gemini_client:
            return await self.llm._audit_gemini(enriched_prompt)
        else:
            return self.llm._mock_audit()

    async def process_chat_query(self, query: str, history: List[Dict], user_role: str) -> Dict[str, Any]:
        """
        Multi-agent workflow for general legal chat.
        1. Retrieval Agent (Searches Local Laws)
        2. Synthesis Agent (Generates response using context)
        """
        logger.info("Agent 1: RAG Retrieval for Chat...")
        context = self.rag.get_context_string(query, n_results=2)
        
        logger.info("Agent 2: Chat Synthesizer...")
        
        if context:
            enriched_query = f"Контекст из базы знаний РК:\n{context}\n\nВопрос пользователя: {query}"
        else:
            enriched_query = query
            
        return await self.llm.chat(enriched_query, history, user_role)

    async def process_chat_query_stream(self, query: str, history: List[Dict], user_role: str):
        """Stream version of the multi-agent chat workflow."""
        logger.info("Agent 1: RAG Retrieval for Chat Stream...")
        context = self.rag.get_context_string(query, n_results=2)
        
        logger.info("Agent 2: Chat Synthesizer Stream...")
        
        if context:
            enriched_query = f"Контекст из базы знаний РК (Использовать только если релевантно):\n{context}\n\nВопрос пользователя: {query}"
        else:
            enriched_query = query
            
        async for chunk in self.llm.chat_stream(enriched_query, history, user_role):
            yield chunk

from services.gemini_service import gemini_service
from services.rag_service import rag_service
from services.legal_scoring import legal_scorer

orchestrator = LegalAgentOrchestrator(gemini_service, rag_service, legal_scorer)

