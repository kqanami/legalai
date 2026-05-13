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

    def _detect_language(self, query: str) -> str:
        """
        Detects the dominant language between Russian and Kazakh.
        Uses a percentage-based approach with keyword support.
        """
        import re
        query_l = query.lower()
        
        # 1. Check for Kazakh-specific Cyrillic letters
        kazakh_specific = set('әғқңөұүһі')
        russian_specific = set('ёъэ') # 'ы' is in both
        
        kz_char_count = sum(1 for char in query_l if char in kazakh_specific)
        ru_char_count = sum(1 for char in query_l if char in russian_specific)
        
        # 2. Check for common Kazakh keywords (including keyboard-friendly versions)
        kz_keywords = {
            'мен', 'сен', 'біз', 'сіз', 'олар', 'және', 'үшін', 'бар', 'жоқ', 
            'болады', 'керек', 'қандай', 'қалай', 'неге', 'қашан', 'рахмет',
            'биз', 'сиз', 'жане', 'ушин', 'жок', 'кандай', 'калай', 'кашан',
            'салем', 'кайырлы', 'кун', 'кеш', 'таң', 'жаксы', 'жаман', 'калайсын',
            'бер', 'берди', 'ал', 'алды', 'кел', 'келди', 'кет', 'кетти', 'айт', 'айтты',
            'маган', 'саган', 'бизге', 'сизге', 'оларга', 'барма', 'жокпа', 'ма', 'ме', 'па', 'пе',
            'кой', 'гой', 'шы', 'ши', 'болсын', 'сау', 'бол', 'кездескенше'
        }
        
        words = set(re.findall(r'[а-яёәғқңөұүһі]+', query_l))
        kz_word_match = len(words.intersection(kz_keywords))
        
        # 3. Decision
        # If specific characters are found, they carry a lot of weight
        if kz_char_count > ru_char_count:
            return "kazakh"
        
        # If mixed or no specific chars, check keywords
        if kz_word_match >= 1:
            return "kazakh"
            
        return "russian"

    def _determine_model(self, query: str, history: List[Dict], user_role: str, user_plan: str = "freemium", total_messages: int = 0) -> str:
        """
        Plan-Aware Smart Routing with Soft Limits:
        - Freemium: Sonnet 3.5 for first 3 messages, then Haiku.
        - GO/ИП: Sonnet 3.5 baseline.
        - BUSINESS: Opus for complex tasks.
        """
        q_lower = query.lower()
        user_plan = user_plan.lower() if user_plan else "freemium"
        
        # 1. Freemium Soft Limit
        if user_plan == "freemium" and total_messages >= 3:
            logger.info("Freemium quota reached, downgrading to Haiku")
            return "cheap"

        # 2. Business users get Opus for deep analysis
        if user_plan == "business":
            smart_triggers = ["подробный анализ", "экспертное мнение", "найди противоречия", "аудит", "smart audit"]
            if any(t in q_lower for t in smart_triggers) or len(query) > 2000:
                return "smart"

        # 3. Simple greetings/chatter for everyone
        legal_keywords = ["закон", "статья", "кодекс", "гк", "ук", "тк", "ип", "тоо", "налог", "суд", "право", "договор", "контракт"]
        is_legal = any(k in q_lower for k in legal_keywords)
        
        if len(query) < 60 and not is_legal:
            return "cheap"
            
        # 4. Default baseline (Sonnet 3.5)
        return "fast"

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
            response = await self.llm.chat(prompt, history=[], user_role="lawyer", model_type="cheap")
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
            verified = await self.llm.chat(prompt, history=[], user_role="lawyer", model_type="cheap")
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

    async def process_chat_query(self, query: str, history: List[Dict], user_role: str, user_plan: str = "freemium", total_messages: int = 0) -> Dict[str, Any]:
        """Orchestrated chat query processing."""
        # 1. Dynamic Query Generation (Internal use Haiku)
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
        
        model_type = self._determine_model(query, history, user_role, user_plan, total_messages)
        lang = self._detect_language(query)
        logger.info(f"Routing query to model: {model_type} (Lang: {lang})")
        
        lang_instruction = "ОТВЕЧАЙ СТРОГО НА КАЗАХСКОМ ЯЗЫКЕ." if lang == "kazakh" else "ОТВЕЧАЙ СТРОГО НА РУССКОМ ЯЗЫКЕ."
        
        enriched_query = f"INSTRUCTION: {lang_instruction}\n\nCONTEXT:\n{context}\n\nQUERY: {query}"
        thought_process = f"Использую базу знаний для ответа. Язык: {lang}. Модель: {model_type}"
        
        response = await self.llm.chat(enriched_query, history, user_role, model_type=model_type)
        
        # 4. Verification (Optional but recommended for high-stakes)
        if context and user_role == "lawyer":
            response["content"] = await self.verify_legal_accuracy(query, response["content"], context)
            
        response["thought"] = thought_process
        return response

    async def process_chat_query_stream(self, query: str, history: List[Dict], user_role: str, user_plan: str = "freemium", total_messages: int = 0) -> AsyncGenerator[str, None]:
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
        
        model_type = self._determine_model(query, history, user_role, user_plan, total_messages)
        lang = self._detect_language(query)
        logger.info(f"Streaming query (Lang: {lang}) with model: {model_type}")
            
        lang_instruction = "ОТВЕЧАЙ СТРОГО НА КАЗАХСКОМ ЯЗЫКЕ." if lang == "kazakh" else "ОТВЕЧАЙ СТРОГО НА РУССКОМ ЯЗЫКЕ."
        
        enriched_query = f"INSTRUCTION: {lang_instruction}\n\nCONTEXT:\n{context}\n\nQUERY: {query}"
        async for chunk in self.llm.chat_stream(enriched_query, history, user_role, model_type=model_type):
            yield chunk

from services.gemini_service import gemini_service
from services.rag_service import rag_service
from services.legal_scoring import legal_scorer

orchestrator = LegalAgentOrchestrator(gemini_service, rag_service, legal_scorer)

