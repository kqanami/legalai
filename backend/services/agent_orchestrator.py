import logging
import json
import asyncio
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

    def _needs_rag(self, query: str) -> bool:
        """Determines if the query actually needs database search (RAG)."""
        q_lower = query.lower().strip()
        
        # Check if the query is just a status declaration or simple reply to a clarification question
        import re
        status_words = {"тоо", "ип", "физлицо", "физическое", "юридическое", "лицо", "да", "нет", "есть", "нету", "договор", "договора"}
        words_only = set(re.findall(r'[а-яёәғқңөұүһіa-z0-9]+', q_lower))
        if len(query) < 40 and words_only and words_only.issubset(status_words.union({"я", "у", "меня", "мы", "вы", "он", "она", "оно", "они", "быть"})):
            logger.info("Skipping RAG for status declaration / simple reply.")
            return False
            
        legal_keywords = [
            "закон", "статья", "кодекс", "гк", "ук", "тк", "коап", "ип", "тоо", 
            "налог", "суд", "право", "договор", "контракт", "штраф", "пеня", 
            "иск", "аренда", "развод", "алименты", "наследство", "жалоба", "заявление",
            "увольн", "уволит", "уволи"
        ]
        
        # If very short and no legal keywords, skip RAG
        if len(query) < 40 and not any(k in q_lower for k in legal_keywords):
            return False
            
        # Common conversational phrases to skip completely
        skip_phrases = [
            "привет", "здравствуй", "спасибо", "ок", "понял", "хорошо", "ясно", 
            "дай адвоката", "найди юриста", "мне нужен адвокат", "свяжи с юристом",
            "пока", "до свидания", "ок спасибо"
        ]
        
        # Check if query is just a simple conversational phrase
        if any(q_lower == p or q_lower.startswith(p + " ") for p in skip_phrases) and len(query) < 60:
            return False
            
        return True

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

    def _compress_contract_text(self, text: str) -> str:
        """
        Compresses contract text to minimize token usage for LLM calls,
        while preserving all legally significant clauses.
        """
        import re
        if not text:
            return ""
            
        # 1. Normalize spacing and newlines to save tokens
        text = re.sub(r'[ \t]+', ' ', text)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # 2. Cut off typical signatures/requisites blocks from the end
        # They consume massive tokens (bank accounts, addresses, etc.) but have 0 legal risks.
        requisites_pattern = re.compile(
            r'(?i)\n\s*(?:(?:1\d|9|8|7|6)\.?\s*)?(?:Реквизиты|Адреса\s+и\s+реквизиты|Юридические\s+адреса|Подписи\s+сторон|Адреса,\s+реквизиты\s+и\s+подписи|Наименования,\s+адреса\s+и\s+реквизиты)\b'
        )
        req_matches = list(requisites_pattern.finditer(text))
        if req_matches:
            last_match = req_matches[-1]
            # Only cut if it is in the second half of the document (to avoid matching early mentions)
            if last_match.start() > len(text) * 0.5:
                text = text[:last_match.start()]
                
        # 3. Cut off "Акт приема-передачи" (Act of Acceptance) if attached at the end
        # The Act is standard boilerplate and has no contract-level risk.
        act_pattern = re.compile(r'(?i)\n\s*(?:Приложение|Акт\s+приема-передачи)\b')
        act_matches = list(act_pattern.finditer(text))
        if act_matches:
            last_match = act_matches[-1]
            if last_match.start() > len(text) * 0.5:
                text = text[:last_match.start()]
                
        return text.strip()

    async def process_contract_audit(self, contract_text: str, doc_type: str = "Юридический документ (Общий)") -> Dict[str, Any]:
        """Multi-agent workflow for contract auditing."""
        logger.info(f"Agent 1: Heuristic Risk Scorer running for doc_type: {doc_type}...")
        heuristic_risks = self.scorer.calculate_risk(contract_text)
        
        logger.info("Agent 2: Dynamic RAG Retrieval...")
        # Dynamic query for contract audit
        audit_queries = await self.generate_search_queries(f"Риски в договоре ({doc_type}): {contract_text[:500]}", [])
        
        combined_context = ""
        for q in audit_queries[:2]:
            context = self.rag.get_context_string(q, n_results=1)  # Compressed to 1 result to save tokens
            if context:
                combined_context += context + "\n---\n"
        
        logger.info("Agent 3: LLM Audit Synthesizer...")
        # Compress the contract text for token savings
        compressed_text = self._compress_contract_text(contract_text)
        logger.info(f"Compressed contract text for LLM from {len(contract_text)} to {len(compressed_text)} chars.")
        
        enriched_prompt = f"""
ТИП ДОГОВОРА: {doc_type}

ОБНАРУЖЕННЫЕ АЛГОРИТМИЧЕСКИЕ РИСКИ:
Уровень риска: {heuristic_risks['level'].upper()} (Score: {heuristic_risks['score']}/100)
Триггеры: {', '.join([t['trigger'] for t in heuristic_risks['found_triggers']])}

ИЗВЛЕЧЕННАЯ БАЗА ЗНАНИЙ (RAG):
{combined_context if combined_context else f"Опирайся на нормы ГК РК и применимое законодательство для данного типа договора ({doc_type})."}

ТЕКСТ ДОГОВОРА:
{compressed_text}
"""
        audit_results = await self.llm.audit_contract(enriched_prompt)
        return {
            **audit_results,
            "original_text": contract_text
        }

    def _get_matching_document(self, query: str, user_docs: List[Any]) -> Any:
        """Finds a matching user document from the database based on the query."""
        if not user_docs:
            return None
            
        query_lower = query.lower()
        
        # 1. Look for explicit matches of the document title (without extension)
        best_match = None
        longest_match_len = 0
        for doc in user_docs:
            name_clean = doc.name.lower()
            for ext in [".docx", ".pdf", ".doc", ".txt"]:
                name_clean = name_clean.replace(ext, "")
            name_clean = name_clean.strip()
            
            if len(name_clean) >= 4 and name_clean in query_lower:
                if len(name_clean) > longest_match_len:
                    best_match = doc
                    longest_match_len = len(name_clean)
                    
        if best_match:
            return best_match
            
        # 2. Look for type-based matches if query contains relevant triggers
        triggers = ["договор", "контракт", "соглашение", "иск", "заявление", "претензия", "жалоба"]
        if any(t in query_lower for t in triggers):
            sorted_docs = sorted(user_docs, key=lambda d: d.created_at, reverse=True)
            for doc in sorted_docs:
                doc_name = doc.name.lower()
                doc_type = doc.doc_type.lower()
                
                if any(k in query_lower for k in ["договор", "контракт", "соглашение"]):
                    if "договор" in doc_name or doc_type == "contract":
                        return doc
                if any(k in query_lower for k in ["иск", "исковое"]):
                    if "иск" in doc_name or doc_type == "claim":
                        return doc
                if any(k in query_lower for k in ["претензия", "жалоба"]):
                    if any(x in doc_name for x in ["претенз", "жалоб"]) or doc_type == "complaint":
                        return doc
                if "заявление" in query_lower:
                    if "заявлен" in doc_name or doc_type in ["claim", "statement"]:
                        return doc

        # 3. Explicit reference to user's file or single file explicit mention
        explicit_triggers = ["мой документ", "мой файл", "мой договор", "загруженный", "этот документ", "этот договор", "в моем файле"]
        if any(t in query_lower for t in explicit_triggers):
            if len(user_docs) == 1:
                return user_docs[0]
            # If multiple docs exist, rely on Step 1 (exact name match) or just don't inject randomly
            
        return None

    def _extract_text_from_doc(self, file_path: str, filename: str) -> str:
        """Extracts text from PDF, DOCX, or TXT without circular dependencies."""
        import os
        ext = os.path.splitext(filename)[1].lower()
        if ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        elif ext == ".pdf":
            try:
                from PyPDF2 import PdfReader
                reader = PdfReader(file_path)
                return "".join(page.extract_text() or "" for page in reader.pages)
            except Exception as e:
                logger.error(f"Failed to extract PDF text in chat: {e}")
                return ""
        elif ext in (".docx", ".doc"):
            try:
                from docx import Document as DocxDocument
                doc = DocxDocument(file_path)
                return "\n".join(p.text for p in doc.paragraphs)
            except Exception as e:
                try:
                    import olefile
                    if olefile.isOleFile(file_path):
                        with olefile.OleFileIO(file_path) as ole:
                            if ole.exists("WordDocument"):
                                with ole.openstream("WordDocument") as stream:
                                    data = stream.read()
                                utf16 = data.decode("utf-16-le", errors="ignore")
                                cp1251 = data.decode("cp1251", errors="ignore")
                                import re
                                cyr = re.compile(r'[\u0410-\u044F\u0401\u0451\u04D8\u04D9\u0492\u0493\u049A\u049B\u04A2\u04A3\u04E8\u04E9\u04B0\u04B1\u04AE\u04AF\u04BA\u04BB\u0406\u0456]')
                                if len(cyr.findall(utf16)) >= len(cyr.findall(cp1251)):
                                    return utf16
                                return cp1251
                except Exception as ole_err:
                    logger.error(f"Legacy doc parser failed in chat: {ole_err}")
                logger.error(f"Failed to extract docx text in chat: {e}")
                return ""
        return ""

    async def process_chat_query(self, query: str, history: List[Dict], user_role: str, user_plan: str = "freemium", total_messages: int = 0, db: Any = None, user_id: int = None, forced_lang: str = None) -> Dict[str, Any]:
        """Orchestrated chat query processing."""
        
        # 1. Smart Routing: Skip RAG for simple conversational queries to save tokens
        if not self._needs_rag(query):
            logger.info("Skipping RAG for simple conversational query.")
            context = ""
            search_queries = []
        else:
            # 2. Dynamic Query Generation: Skip LLM call if query is simple & short to save 1s latency
            if not history or (len(query) < 120 and not any(h in query.lower() for h in ["выше", "ранее", "этот", "этого", "тот", "того", "документ", "договоре"])):
                search_queries = [query]
                logger.info(f"Using original query for RAG search (saved query generation latency): {search_queries}")
            else:
                search_queries = await self.generate_search_queries(query, history)
                logger.info(f"Generated queries: {search_queries}")

            # 3. Multi-query Retrieval
            tasks = [asyncio.to_thread(self.rag.search, sq, 2) for sq in search_queries]
            docs_results = await asyncio.gather(*tasks)
            all_docs = []
            for docs in docs_results:
                all_docs.extend(docs)
            
            # 4. Context Token Compression: Limit to MAX 3 unique chunks
            unique_docs = list(set(all_docs))[:3]
            context = "\n\n---\n".join(unique_docs)
            logger.info(f"RAG Context compressed to {len(unique_docs)} chunks.")
        
        # Fetch user documents context if db and user_id are provided
        docs_context = ""
        matched_doc_text = ""
        if db and user_id:
            try:
                from models import Document
                user_docs = db.query(Document).filter(Document.user_id == user_id).all()
                if user_docs:
                    docs_context = "ДОСТУПНЫЕ ДОКУМЕНТЫ В КАБИНЕТЕ ПОЛЬЗОВАТЕЛЯ:\n"
                    for d in user_docs:
                        docs_context += f"- ID: {d.id}, Название: \"{d.name}\", Тип: {d.doc_type}, Создан: {d.created_at.strftime('%d.%m.%Y')}\n"
                    
                    matched_doc = self._get_matching_document(query, user_docs)
                    if matched_doc:
                        doc_text = self._extract_text_from_doc(matched_doc.file_path, matched_doc.original_filename)
                        if len(doc_text) > 4000:
                            doc_text = doc_text[:4000] + "\n...[Текст договора обрезан для экономии токенов]..."
                        matched_doc_text = f"\n\nТЕКСТ АКТИВНОГО ДОКУМЕНТА ПОЛЬЗОВАТЕЛЯ '{matched_doc.name}':\n{doc_text}\n"
                        logger.info(f"Loaded matching user document for chat: {matched_doc.name}")
            except Exception as doc_err:
                logger.error(f"Error querying user documents: {doc_err}")

        full_context = context
        if docs_context:
            full_context = docs_context + "\n---\n" + full_context
        if matched_doc_text:
            full_context = full_context + "\n---\n" + matched_doc_text

        model_type = self._determine_model(query, history, user_role, user_plan, total_messages)
        # Robust language check: detect query language first, fallback to forced_lang for short queries
        detected_lang = self._detect_language(query)
        if len(query.strip()) < 15 and forced_lang:
            lang = "kazakh" if forced_lang.lower() in ["kk", "kz", "kazakh"] else "russian"
        else:
            lang = detected_lang
        logger.info(f"Routing query to model: {model_type} (Lang: {lang})")
        
        lang_instruction = "ОТВЕЧАЙ СТРОГО НА КАЗАХСКОМ ЯЗЫКЕ (ИСПОЛЬЗУЙ ИСКЛЮЧИТЕЛЬНО КИРИЛЛИЦУ, ЛАТИНИЦА И АРАБСКАЯ ВЯЗЬ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ)." if lang == "kazakh" else "ОТВЕЧАЙ СТРОГО НА РУССКОМ ЯЗЫКЕ."
        
        ecosystem_instruction = """
ЭКОСИСТЕМА И ИНТЕГРАЦИЯ:
1. Если пользователь хочет составить/создать/написать юридический документ (например: заявление в суд, исковое заявление, претензию, жалобу, договор аренды и т.д.), ты ДОЛЖЕН предложить ему сгенерировать готовый шаблон в нашей системе и предоставить точную ссылку.
   Ссылки для генерации шаблонов:
   - Исковое заявление: [Создать исковое заявление](/dashboard/documents?generate=claim)
   - Претензия/Жалоба: [Создать претензию или жалобу](/dashboard/documents?generate=complaint)
   - Договор: [Создать договор](/dashboard/documents?generate=contract)
   - Обычное заявление: [Создать заявление](/dashboard/documents?generate=statement)
   Пример: "Я могу помочь вам составить исковое заявление. Для этого вы можете использовать наш конструктор: [Создать исковое заявление](/dashboard/documents?generate=claim)."
2. Если в контексте выше передан 'ТЕКСТ АКТИВНОГО ДОКУМЕНТА ПОЛЬЗОВАТЕЛЯ', обязательно сошлись на него, проанализируй его и ответь на вопросы пользователя именно на основе этого текста. Упомяни название этого документа.
"""
        
        enriched_query = f"INSTRUCTION: {lang_instruction}\n{ecosystem_instruction}\n\nCONTEXT:\n{full_context}\n\nQUERY: {query}"
        thought_process = f"Использую базу знаний для ответа. Язык: {lang}. Модель: {model_type}"
        
        response = await self.llm.chat(enriched_query, history, user_role, model_type=model_type)
        
        # 4. Verification (Optional but recommended for high-stakes)
        if context and user_role == "lawyer":
            response["content"] = await self.verify_legal_accuracy(query, response["content"], context)
            
        response["thought"] = thought_process
        return response

    async def process_chat_query_stream(self, query: str, history: List[Dict], user_role: str, user_plan: str = "freemium", total_messages: int = 0, db: Any = None, user_id: int = None, forced_lang: str = None) -> AsyncGenerator[str, None]:
        """Stream version with orchestrated retrieval."""
        
        # 1. Smart Routing: Skip RAG for simple conversational queries
        if not self._needs_rag(query):
            logger.info("Skipping RAG for simple conversational query (Stream).")
            context = ""
            search_queries = []
        else:
            # For streaming, we do retrieval upfront to avoid interruption
            # Skip query-gen LLM call if query is simple & short to save 1s latency
            if not history or (len(query) < 120 and not any(h in query.lower() for h in ["выше", "ранее", "этот", "этого", "тот", "того", "документ", "договоре"])):
                search_queries = [query]
                logger.info(f"Using original query for RAG stream search (saved query generation latency): {search_queries}")
            else:
                search_queries = await self.generate_search_queries(query, history)
            
            tasks = [asyncio.to_thread(self.rag.search, sq, 2) for sq in search_queries]
            docs_results = await asyncio.gather(*tasks)
            all_docs = []
            for docs in docs_results:
                all_docs.extend(docs)
            
            # Token Compression: Max 3 chunks
            unique_docs = list(set(all_docs))[:3]
            context = "\n\n---\n".join(unique_docs)
            logger.info(f"RAG Context compressed to {len(unique_docs)} chunks (Stream).")
        
        # Fetch user documents context if db and user_id are provided
        docs_context = ""
        matched_doc_text = ""
        if db and user_id:
            try:
                from models import Document
                user_docs = db.query(Document).filter(Document.user_id == user_id).all()
                if user_docs:
                    docs_context = "ДОСТУПНЫЕ ДОКУМЕНТЫ В КАБИНЕТЕ ПОЛЬЗОВАТЕЛЯ:\n"
                    for d in user_docs:
                        docs_context += f"- ID: {d.id}, Название: \"{d.name}\", Тип: {d.doc_type}, Создан: {d.created_at.strftime('%d.%m.%Y')}\n"
                    
                    matched_doc = self._get_matching_document(query, user_docs)
                    if matched_doc:
                        doc_text = self._extract_text_from_doc(matched_doc.file_path, matched_doc.original_filename)
                        if len(doc_text) > 4000:
                            doc_text = doc_text[:4000] + "\n...[Текст договора обрезан для экономии токенов]..."
                        matched_doc_text = f"\n\nТЕКСТ АКТИВНОГО ДОКУМЕНТА ПОЛЬЗОВАТЕЛЯ '{matched_doc.name}':\n{doc_text}\n"
                        logger.info(f"Loaded matching user document for chat stream: {matched_doc.name}")
            except Exception as doc_err:
                logger.error(f"Error querying user documents: {doc_err}")

        full_context = context
        if docs_context:
            full_context = docs_context + "\n---\n" + full_context
        if matched_doc_text:
            full_context = full_context + "\n---\n" + matched_doc_text

        # Send initial "thought" as a hidden chunk or separate event if frontend supports it
        # Here we just log it and proceed to stream the main content
        logger.info(f"Streaming with queries: {search_queries}")
        
        model_type = self._determine_model(query, history, user_role, user_plan, total_messages)
        # Robust language check: detect query language first, fallback to forced_lang for short queries
        detected_lang = self._detect_language(query)
        if len(query.strip()) < 15 and forced_lang:
            lang = "kazakh" if forced_lang.lower() in ["kk", "kz", "kazakh"] else "russian"
        else:
            lang = detected_lang
        logger.info(f"Streaming query (Lang: {lang}) with model: {model_type}")
            
        lang_instruction = "ОТВЕЧАЙ СТРОГО НА КАЗАХСКОМ ЯЗЫКЕ (ИСПОЛЬЗУЙ ИСКЛЮЧИТЕЛЬНО КИРИЛЛИЦУ, ЛАТИНИЦА И АРАБСКАЯ ВЯЗЬ КАТЕГОРИЧЕСКИ ЗАПРЕЩЕНЫ)." if lang == "kazakh" else "ОТВЕЧАЙ СТРОГО НА РУССКОМ ЯЗЫКЕ."
        
        ecosystem_instruction = """
ЭКОСИСТЕМА И ИНТЕГРАЦИЯ:
1. Если пользователь хочет составить/создать/написать юридический документ (например: заявление в суд, исковое заявление, претензию, жалобу, договор аренды и т.д.), ты ДОЛЖЕН предложить ему сгенерировать готовый шаблон в нашей системе и предоставить точную ссылку.
   Ссылки для генерации шаблонов:
   - Исковое заявление: [Создать исковое заявление](/dashboard/documents?generate=claim)
   - Претензия/Жалоба: [Создать претензию или жалобу](/dashboard/documents?generate=complaint)
   - Договор: [Создать договор](/dashboard/documents?generate=contract)
   - Обычное заявление: [Создать заявление](/dashboard/documents?generate=statement)
   Пример: "Я могу помочь вам составить исковое заявление. Для этого вы можете использовать наш конструктор: [Создать исковое заявление](/dashboard/documents?generate=claim)."
2. Если в контексте выше передан 'ТЕКСТ АКТИВНОГО ДОКУМЕНТА ПОЛЬЗОВАТЕЛЯ', обязательно сошлись на него, проанализируй его и ответь на вопросы пользователя именно на основе этого текста. Упомяни название этого документа.
"""

        enriched_query = f"INSTRUCTION: {lang_instruction}\n{ecosystem_instruction}\n\nCONTEXT:\n{full_context}\n\nQUERY: {query}"
        async for chunk in self.llm.chat_stream(enriched_query, history, user_role, model_type=model_type):
            yield chunk

from services.gemini_service import gemini_service
from services.rag_service import rag_service
from services.legal_scoring import legal_scorer

orchestrator = LegalAgentOrchestrator(gemini_service, rag_service, legal_scorer)

