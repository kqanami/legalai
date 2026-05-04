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

LEGAL_CHAT_SYSTEM = """Ты — высококлассный AI-Юрист по законодательству РК. 
ОТВЕЧАЙ СТРОГО НА РУССКОМ ИЛИ КАЗАХСКОМ ЯЗЫКЕ.

ПРАВИЛА:
1. НИКАКИХ ИЕРОГЛИФОВ, КИТАЙСКИХ ИЛИ ДРУГИХ ИНОСТРАННЫХ СИМВОЛОВ. Только кириллица или латиница (для ссылок).
2. СТРУКТУРА: Всегда ставь ПУСТУЮ СТРОКУ после заголовков (###) и между абзацами. Не склеивай текст.
3. КРАСОТА: Используй заголовки (###), жирный текст (**важное**) и списки.
4. ЗАКОНЫ: Ссылайся на статьи Кодексов и Законов РК.

ФОРМАТ ЗАВЕРШЕНИЯ (ОБЯЗАТЕЛЬНО В КОНЦЕ):

[REFS]
[{"title": "...", "url": "...", "articles": "..."}]

[SEGMENT]
b2c

[ESCALATION]
{"needed": true, "reason": "...", "category": "..."}
"""
LAWYER_CHAT_SYSTEM = """Ты — высококлассный AI-ассистент для юристов по законодательству РК.
ПРАВИЛА:
1. Твоя цель — помогать профессиональному юристу РК в его работе (поиск прецедентов, анализ законов, подготовка стратегий).
2. Общайся профессиональным юридическим языком.
3. Отвечай на языке пользователя (русский или казахский).
4. Ссылайся на конкретные статьи законов РК и нормативно-правовые акты.
5. Формат: Markdown.
6. В конце добавляй:
<!--REFS-->
[{"title": "Название закона", "url": "https://adilet.zan.kz/...", "articles": "Ст. XX-YY"}]
7. Добавляй сегмент:
<!--SEGMENT-->b2c или b2b
8. ВАЖНО: Никогда не предлагай нанять юриста или обратиться к адвокату, так как ты УЖЕ общаешься с юристом. Не добавляй блок эскалации.
"""

AUDIT_SYSTEM = """Ты — AI-аудитор договоров РК. Проанализируй текст и выяви юридические риски.
Верни JSON: risks (level, title, description, recommendation, article, url) и summary."""

COUNTERPARTY_SYSTEM = """Ты — AI-аналитик по БИН РК. Найди РЕАЛЬНЫЕ данные компании.
Верни JSON: companyName, bin, status, registrationDate, director, address, activity, taxDebt, riskLevel, employees, aiAnalysis."""

DOCUMENT_GEN_SYSTEM = """Ты — AI-генератор юридических документов РК. Сгенерируй полный текст в Markdown."""

LAWYER_CHAT_SYSTEM = """Ты — высококлассный AI-ассистент для юристов по законодательству РК.
ПРАВИЛА:
1. Твоя цель — помогать профессиональному юристу РК в его работе (поиск прецедентов, анализ законов, подготовка стратегий).
2. Общайся профессиональным юридическим языком.
3. Отвечай на языке пользователя (русский или казахский).
4. Ссылайся на конкретные статьи законов РК и нормативно-правовые акты.
5. Формат: Markdown.
6. В конце добавляй:
<!--REFS-->
[{"title": "Название закона", "url": "https://adilet.zan.kz/...", "articles": "Ст. XX-YY"}]
7. Добавляй сегмент:
<!--SEGMENT-->b2c или b2b
8. ВАЖНО: Никогда не предлагай нанять юриста или обратиться к адвокату, так как ты УЖЕ общаешься с юристом. Не добавляй блок эскалации.
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
                logger.warning(f"Groq Chat Error: {e}. Falling back...")
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
        resp = self.groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=msgs, temperature=0.7)
        return self._parse_chat_response(resp.choices[0].message.content)

    async def _chat_groq_stream(self, message, history, user_role="citizen") -> AsyncGenerator[str, None]:
        msgs = self._build_messages(message, history, user_role=user_role)
        stream = self.groq_client.chat.completions.create(model="llama-3.3-70b-versatile", messages=msgs, temperature=0.7, stream=True)
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
        resp = self.gemini_client.models.generate_content(model="gemini-2.0-flash", contents=contents, config=types.GenerateContentConfig(system_instruction=sys_prompt, temperature=0.7))
        return self._parse_chat_response(resp.text or "")

    async def _chat_gemini_stream(self, message, history, user_role="citizen") -> AsyncGenerator[str, None]:
        contents = self._build_gemini_contents(message, history)
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        resp = self.gemini_client.models.generate_content_stream(model="gemini-2.0-flash", contents=contents, config=types.GenerateContentConfig(system_instruction=sys_prompt, temperature=0.7))
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
        content = raw
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
