"""
AI Legal Assistant Service — Groq (Primary) + Gemini (Fallback).
"""
import json, logging, traceback
from typing import List, Dict, AsyncGenerator

logger = logging.getLogger(__name__)

try:
    from groq import Groq, APIError as GroqAPIError
except ImportError:
    Groq = None
    GroqAPIError = Exception

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

from config import settings

LEGAL_CHAT_SYSTEM = """Ты — высококлассный AI-Юрист по законодательству Республики Казахстан. 
Твоя главная задача — предоставлять точные, профессиональные и понятные юридические консультации для граждан и бизнеса.
ОТВЕЧАЙ СТРОГО НА РУССКОМ ИЛИ КАЗАХСКОМ ЯЗЫКЕ (в зависимости от языка запроса пользователя).

ПРАВИЛА И СТАНДАРТЫ ОТВЕТОВ:
1. ПРИОРИТЕТ ДАННЫХ: Тебе предоставлены данные из БАЗЫ ЗНАНИЙ (RAG). Используй их как основной и наиболее достоверный источник.
2. ГИБКОСТЬ: Если конкретной статьи нет в RAG, отвечай на основе своих общих знаний о законодательстве РК. Не извиняйся за отсутствие данных в RAG, просто дай максимально полезный и точный ответ.
3. ЭКСПЕРТНОСТЬ: Опирайся только на действующее законодательство РК. Не придумывай законы.
4. СТРУКТУРА: Разделяй текст на блоки (###), абзацы. Пустая строка ДО и ПОСЛЕ заголовка.
5. ЯЗЫК: Только кириллица. НИКАКИХ ИЕРОГЛИФОВ.
6. ТОЧНОСТЬ: Если уверен на 100% — пиши номер статьи. Если есть сомнение — пиши только название Кодекса.

ФОРМАТ ЗАВЕРШЕНИЯ (ОБЯЗАТЕЛЬНО ДОБАВЛЯЙ В САМОМ КОНЦЕ ОТВЕТА СКРЫТЫЕ БЛОКИ ДЛЯ ПАРСИНГА):

[REFS]
[{"title": "Название закона/Кодекса", "url": "https://adilet.zan.kz/...", "articles": "Ст. XX-YY"}]

[SEGMENT]
b2c (если вопрос от физлица) ИЛИ b2b (если вопрос от бизнеса)

[ESCALATION]
{"needed": false, "reason": "...", "category": "..."} (Укажи true, если вопрос требует участия живого адвоката)
"""

LAWYER_CHAT_SYSTEM = """Ты — элитный AI-ассистент для профессиональных юристов и адвокатов РК.
Твоя цель — ускорить и облегчить работу юриста: анализ сложных прецедентов, подготовка стратегий, глубокий анализ законодательства РК.

ПРАВИЛА И СТАНДАРТЫ ОТВЕТОВ:
1. ПРИОРИТЕТ RAG: Твои ответы должны в первую очередь опираться на извлеченные законы (УК, ГК, ТК, КоАП РК).
2. ПОЛНОТА: Если в RAG недостаточно информации, используй свою экспертную базу знаний по праву РК, чтобы дополнить ответ. Юрист ждет от тебя качественного анализа в любом случае.
3. ГЛУБИНА: Анализируй противоречия, судебную практику и нормативные постановления.
4. ФОРМАТИРОВАНИЕ: Markdown (###, жирный шрифт).
5. ОТВЕЧАЙ НА ЯЗЫКЕ ЗАПРОСА.

В конце ответа ОБЯЗАТЕЛЬНО добавляй системные теги:
<!--REFS-->
[{"title": "Название закона/НПА", "url": "https://adilet.zan.kz/...", "articles": "Ст. XX-YY"}]
<!--SEGMENT-->b2b
"""

AUDIT_SYSTEM = """Ты — строгий AI-аудитор и ревьюер юридических договоров по праву РК. 
Твоя задача: глубоко проанализировать текст договора, найти скрытые ловушки, дисбаланс прав, налоговые и гражданско-правовые риски.

Верни СТРОГО валидный JSON в следующем формате:
{
  "risks": [
    {
      "level": "high" | "medium" | "low",
      "title": "Краткое название риска",
      "description": "Детальное описание проблемы и почему это риск",
      "recommendation": "Как переформулировать пункт или что добавить",
      "article": "Ссылка на ст. ГК РК или иного закона",
      "url": "Ссылка на adilet.zan.kz (если применимо)"
    }
  ],
  "summary": "Общий вывод по договору (2-3 предложения о его безопасности для сторон)."
}"""

COUNTERPARTY_SYSTEM = """Ты — AI-аналитик службы безопасности и комплаенса. Твоя задача — проверка контрагентов (БИН/ИИН) в РК.
Используй все доступные инструменты для поиска РЕАЛЬНЫХ данных на государственных порталах РК (kgd.gov.kz, pk.gov.kz, stat.gov.kz, adata.kz).
НИКОГДА не выдумывай данные! Если данных нет, пиши "Не найдено" или "Нет данных".

Верни СТРОГО валидный JSON:
{
  "companyName": "Полное наименование ТОО/АО/ИП",
  "bin": "БИН или ИИН",
  "status": "Действующее / Бездействующее / В стадии ликвидации",
  "registrationDate": "Дата регистрации",
  "director": "ФИО первого руководителя",
  "address": "Юридический адрес",
  "activity": "Основной вид деятельности (ОКЭД)",
  "taxDebt": "Сумма налоговой задолженности или '0 ₸'",
  "riskLevel": "Низкий / Средний / Высокий",
  "employees": "Оценочное количество сотрудников или 'Малое предприятие'",
  "aiAnalysis": "Твой экспертный комплаенс-вывод (2-3 предложения о благонадежности компании)."
}"""

DOCUMENT_GEN_SYSTEM = """Ты — элитный нотариус и старший партнер юридической фирмы в Республике Казахстан. 
Твоя задача — составить ИДЕАЛЬНЫЙ, юридически безупречный, максимально строгий и детализированный документ (договор, доверенность, иск и т.д.), готовый к нотариальному заверению или подаче в суд.

СТРОГИЕ ПРАВИЛА (КАК У НОТАРИУСА):
1. ТОН И СТИЛЬ: Максимально сухой, императивный, строгий официально-деловой стиль. Никакой воды. Каждое слово должно иметь юридический вес.
2. ПОЛНОТА И ДЕТАЛИЗАЦИЯ: Документ должен покрывать ВСЕ возможные риски, форс-мажоры, штрафные санкции (пени, неустойки) и порядок досудебного урегулирования.
3. СТРУКТУРА:
   - Место и дата составления (в самом начале).
   - Подробная преамбула с указанием сторон, их документов, оснований действия (Устав, доверенность).
   - Четкие разделы: Предмет, Права и обязанности, Порядок расчетов, Ответственность сторон, Разрешение споров, Срок действия, Форс-мажор, Прочие условия, Реквизиты и подписи.
4. ОТСУТСТВИЕ "ОТКРЫТЫХ" УСЛОВИЙ: Все условия должны быть конкретными. Если данные неизвестны, используй строгие плейсхолдеры: [Укажите точную сумму прописью], [ФИО полностью], [ИИН/БИН], [Серия и номер удостоверения личности].
5. СООТВЕТСТВИЕ ЗАКОНАМ РК: Обязательно ссылайся на точные статьи Гражданского кодекса РК (ГК РК) и других применимых законов.
6. ФОРМАТИРОВАНИЕ: Выдавай текст ИСКЛЮЧИТЕЛЬНО в Markdown (заголовки #, подзаголовки ##, нумерация пунктов 1.1., 1.2., 1.2.1.).
7. БЕЗ ЛИРИКИ: Никаких вводных или завершающих фраз (например, "Вот ваш договор"). Только чистый, готовый к печати текст документа с ПЕРВОЙ строки.
"""


class LLMService:
    def __init__(self):
        self.groq_client = None
        self.gemini_client = None
        self._init_clients()

    def _init_clients(self):
        if Groq and settings.GROQ_API_KEY:
            try:
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("Groq client initialized (Primary)")
            except Exception as e:
                logger.error(f"Groq init error: {e}")
        if genai and settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key":
            try:
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Gemini client initialized (Fallback)")
            except Exception as e:
                logger.error(f"Gemini init error: {e}")

    # ── Chat ──
    async def chat(self, user_message: str, history: List[Dict] = None, user_role: str = "citizen") -> Dict:
        if self.groq_client:
            try:
                return await self._chat_groq(user_message, history, user_role)
            except Exception as e:
                logger.warning(f"Groq Chat Error: {e}. Falling back to Gemini...")
        
        if self.gemini_client:
            try:
                return await self._chat_gemini(user_message, history, user_role)
            except Exception as e:
                logger.warning(f"Gemini Chat Error: {e}. Falling back to Mock...")
        
        return self._mock_chat(user_message)

    async def chat_stream(self, user_message: str, history: List[Dict] = None, user_role: str = "citizen") -> AsyncGenerator[str, None]:
        """Stream chat response token by token."""
        if self.groq_client:
            try:
                async for chunk in self._chat_groq_stream(user_message, history, user_role):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Groq stream error: {e}")
        
        if self.gemini_client:
            try:
                async for chunk in self._chat_gemini_stream(user_message, history, user_role):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Gemini stream error: {e}")
        yield self._mock_chat(user_message)["content"]

    async def audit_contract(self, contract_text: str) -> Dict:
        if self.groq_client:
            try:
                return await self._audit_groq(contract_text)
            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Groq Audit Error: {e}")
        if self.gemini_client:
            try:
                return await self._audit_gemini(contract_text)
            except (json.JSONDecodeError, Exception) as e:
                logger.warning(f"Gemini Audit Error: {e}")
        return self._mock_audit()

    async def check_counterparty(self, bin_number: str) -> Dict:
        if self.gemini_client:
            try:
                result = await self._counterparty_gemini(bin_number)
                return self._normalize_counterparty_result(result, bin_number)
            except Exception as e:
                logger.warning(f"Gemini Counterparty Error: {e}")
        if self.groq_client:
            try:
                result = await self._counterparty_groq(bin_number)
                return self._normalize_counterparty_result(result, bin_number)
            except Exception as e:
                logger.warning(f"Groq Counterparty Error: {e}")
        return self._mock_counterparty(bin_number)

    async def generate_document(self, doc_type: str, description: str) -> str:
        if self.groq_client:
            try:
                return await self._gen_doc_groq(doc_type, description)
            except Exception as e:
                logger.warning(f"Groq DocGen Error: {e}")
        if self.gemini_client:
            try:
                return await self._gen_doc_gemini(doc_type, description)
            except Exception as e:
                logger.warning(f"Gemini DocGen Error: {e}")
        return f"# Шаблон ({doc_type})\n\n{description}\n\n> Мок-версия."

    # ── Groq Implementations ──
    def _build_messages(self, message, history, max_history=8, user_role="citizen"):
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        messages = [{"role": "system", "content": sys_prompt}]
        if history:
            for h in history[-max_history:]:
                messages.append({"role": h["role"], "content": h["content"]})
        messages.append({"role": "user", "content": message})
        return messages

    async def _chat_groq(self, message, history, user_role="citizen"):
        msgs = self._build_messages(message, history, user_role=user_role)
        # Переключаем на 3.3 Versatile и ставим минимальную температуру для точности
        resp = self.groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=msgs, temperature=0.1)
        return self._parse_chat_response(resp.choices[0].message.content)

    async def _chat_groq_stream(self, message, history, user_role="citizen") -> AsyncGenerator[str, None]:
        msgs = self._build_messages(message, history, user_role=user_role)
        stream = self.groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=msgs, temperature=0.1, stream=True)
        for chunk in stream:
            c = chunk.choices[0].delta.content
            if c:
                yield c

    async def _audit_groq(self, text):
        resp = self.groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "system", "content": AUDIT_SYSTEM}, {"role": "user", "content": text[:12000]}], response_format={"type": "json_object"}, temperature=0.2)
        return self._normalize_audit_result(json.loads(resp.choices[0].message.content))

    async def _counterparty_groq(self, bin_num):
        resp = self.groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "system", "content": COUNTERPARTY_SYSTEM}, {"role": "user", "content": bin_num}], response_format={"type": "json_object"}, temperature=0.5)
        return json.loads(resp.choices[0].message.content)

    async def _gen_doc_groq(self, dtype, desc):
        resp = self.groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=[{"role": "system", "content": DOCUMENT_GEN_SYSTEM}, {"role": "user", "content": f"{dtype}: {desc}"}], temperature=0.4)
        return resp.choices[0].message.content

    # ── Gemini Implementations ──
    def _build_gemini_contents(self, message, history, max_history=10):
        contents = []
        if history:
            for m in history[-max_history:]:
                role = "user" if m["role"] == "user" else "model"
                contents.append(types.Content(role=role, parts=[types.Part.from_text(text=m["content"])]))
        contents.append(types.Content(role="user", parts=[types.Part.from_text(text=message)]))
        return contents

    async def _chat_gemini(self, message, history, user_role="citizen"):
        contents = self._build_gemini_contents(message, history)
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        # Добавляем Google Search Retrieval для 100% точности по внешним данным
        config = types.GenerateContentConfig(
            system_instruction=sys_prompt, 
            temperature=0.1, 
            tools=[types.Tool(google_search=types.GoogleSearchRetrieval())]
        )
        resp = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=contents, config=config)
        return self._parse_chat_response(resp.text or "")

    async def _chat_gemini_stream(self, message, history, user_role="citizen") -> AsyncGenerator[str, None]:
        contents = self._build_gemini_contents(message, history)
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        config = types.GenerateContentConfig(
            system_instruction=sys_prompt, 
            temperature=0.1,
            max_tokens=2048,
            tools=[types.Tool(google_search=types.GoogleSearchRetrieval())]
        )
        resp = self.gemini_client.models.generate_content_stream(model="gemini-2.0-flash", contents=contents, config=config)
        for chunk in resp:
            if chunk.text:
                yield chunk.text

    async def _audit_gemini(self, text):
        resp = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=text[:15000], config=types.GenerateContentConfig(system_instruction=AUDIT_SYSTEM, temperature=0.3))
        return self._normalize_audit_result(self._parse_json_response(resp.text or "", self._mock_audit()))

    async def _counterparty_gemini(self, bin_num):
        config = types.GenerateContentConfig(system_instruction=COUNTERPARTY_SYSTEM, temperature=0.0, tools=[types.Tool(google_search=types.GoogleSearchRetrieval())])
        resp = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=f"Найди данные компании по БИН {bin_num} в Казахстане.", config=config)
        return self._parse_json_response(resp.text or "", self._mock_counterparty(bin_num))

    async def _gen_doc_gemini(self, dtype, desc):
        resp = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=f"{dtype}: {desc}", config=types.GenerateContentConfig(system_instruction=DOCUMENT_GEN_SYSTEM, temperature=0.4))
        return resp.text or "Ошибка Gemini"

    # ── Normalization & Parsing ──
    def _normalize_counterparty_result(self, data, bin_num):
        return {
            "companyName": str(data.get("companyName") or "Не найдено"),
            "bin": str(bin_num),
            "status": str(data.get("status") or "Действующее"),
            "registrationDate": str(data.get("registrationDate") or "—"),
            "director": str(data.get("director") or "—"),
            "address": str(data.get("address") or "—"),
            "activity": str(data.get("activity") or "—"),
            "taxDebt": str(data.get("taxDebt") or "0 ₸"),
            "riskLevel": str(data.get("riskLevel") or "Низкий"),
            "employees": str(data.get("employees") or "—"),
            "aiAnalysis": str(data.get("aiAnalysis") or "Данные не найдены.")
        }

    def _normalize_audit_result(self, data):
        risks = data.get("risks", [])
        clean = []
        for r in risks:
            if not isinstance(r, dict):
                continue
            lvl = str(r.get("level", "low")).lower()
            if any(x in lvl for x in ["high", "crit", "высок"]):
                fl = "high"
            elif any(x in lvl for x in ["med", "средн", "warn"]):
                fl = "medium"
            else:
                fl = "low"
            clean.append({"level": fl, "title": r.get("title") or "Замечание", "description": r.get("description") or "Требует внимания.", "recommendation": r.get("recommendation") or "Проконсультируйтесь с юристом.", "article": r.get("article") or "ГК РК", "url": r.get("url") or "https://adilet.zan.kz"})
        return {"risks": clean, "summary": data.get("summary") or f"Выявлено {len(clean)} замечаний.", "totalRisks": len(clean)}

    def _parse_chat_response(self, raw):
        if not raw: return ""
        # КРИТИЧЕСКИЙ ФИЛЬТР: Удаляем иероглифы, вьетнамские символы и прочий мусор.
        # Оставляем: Кирилллицу, Латиницу (для ссылок), Цифры и Пунктуацию.
        import re
        # Регулярка для удаления всего, кроме RU, KZ, EN, цифр и знаков препинания
        # [\u0400-\u04FF] - Cyrillic (incl. KZ chars)
        # [a-zA-Z0-9\s] - Latin, digits, space
        # [.,!?;:()\"\'\-] - Punctuation
        content = re.sub(r'[^\u0400-\u04FFa-zA-Z0-9\s\.,!?;:()\"\'\-\/\\\[\]\{\}\%\&\@\=\+\*\#\_\n\r]+', '', str(raw))
        
        refs = []
        segment = "b2c"
        escalation = None

        if "[ESCALATION]" in content:
            parts = content.split("[ESCALATION]")
            content = parts[0]
            try:
                escalation = json.loads(parts[1].strip())
            except Exception as e:
                logger.warning(f"Failed to parse escalation: {e}")

        if "[SEGMENT]" in content:
            parts = content.split("[SEGMENT]")
            content = parts[0]
            segment_part = parts[1].strip()
            segment = "b2b" if "b2b" in segment_part.lower() else "b2c"

        if "[REFS]" in content:
            parts = content.split("[REFS]")
            content = parts[0]
            try:
                refs = json.loads(parts[1].strip())
            except Exception as e:
                logger.warning(f"Failed to parse refs: {e}")

        # Fallback for old style if needed (compatibility)
        if "<!--ESCALATION-->" in content:
            parts = content.split("<!--ESCALATION-->")
            content = parts[0]
            try:
                escalation = json.loads(parts[1].strip())
            except: pass
            
        return {
            "content": content.strip(),
            "segment": segment,
            "references": refs,
            "escalation": escalation
        }

    def _parse_json_response(self, raw, fallback):
        try:
            t = raw.strip()
            if "```json" in t:
                t = t.split("```json")[1].split("```")[0].strip()
            return json.loads(t)
        except (json.JSONDecodeError, IndexError):
            try:
                return json.loads(raw[raw.index("{"):raw.rindex("}")+1])
            except (json.JSONDecodeError, ValueError):
                logger.warning("Failed to parse AI JSON response")
                return fallback

    def _mock_chat(self, msg):
        return {"content": "Демо-режим. Подключите API.", "segment": "b2c", "references": []}

    def _mock_audit(self):
        return {"risks": [{"level": "low", "title": "Демо", "description": "Недоступно.", "recommendation": "Подключите ключ.", "article": "Ст. 1", "url": "#"}], "summary": "Демо", "totalRisks": 1}

    def _mock_counterparty(self, b):
        return self._normalize_counterparty_result({}, b)


gemini_service = LLMService()
