"""
AI Legal Assistant Service — Groq (Primary) + Gemini (Fallback).
"""
import json, logging, traceback, asyncio
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

try:
    import anthropic
except ImportError:
    anthropic = None

from config import settings

LEGAL_CHAT_SYSTEM = """Ты — высококлассный AI-Юрист по законодательству Республики Казахстан. 
Твоя главная задача — предоставлять точные, профессиональные и понятные юридические консультации для граждан и бизнеса.
ОТВЕЧАЙ СТРОГО НА РУССКОМ ИЛИ КАЗАХСКОМ ЯЗЫКЕ (в зависимости от языка запроса пользователя).

ПРАВИЛА И СТАНДАРТЫ ОТВЕТОВ:
1. ПРИОРИТЕТ ДАННЫХ (RAG): Тебе предоставлены проверенные данные из БАЗЫ ЗНАНИЙ (RAG). Используй их как основной, абсолютно приоритетный источник. Все ссылки на adilet.zan.kz бери строго из этих RAG-данных.
2. ГИБКОСТЬ: Если конкретной статьи нет в RAG, отвечай на основе своих общих знаний о законодательстве РК. Не извиняйся за отсутствие данных в RAG, просто дай максимально полезный и точный ответ.
3. ЭКСПЕРТНОСТЬ (🚫 ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ЗАКОНОВ): Ссылайся исключительно на реально существующие НПА и статьи Республики Казахстан. Категорически запрещено выдумывать несуществующие номера статей ГК РК, ТК РК или неверные ссылки. Если статьи нет в предоставленном блоке RAG-базы знаний и ты не уверен в ней на 100%, укажи общую норму (например, "В соответствии с Гражданским кодексом РК о залоге"), но никогда не выдумывай номера статей.
4. СТРУКТУРА: Разделяй текст на блоки (###), абзацы. Пустая строка ДО и ПОСЛЕ заголовка.
5. ЯЗЫК: Только кириллица. НИКАКИХ ИЕРОГЛИФОВ.
6. ТОЧНОСТЬ: Если уверен на 100% — пиши номер статьи. Если есть сомнение — пиши только название Кодекса.
7. ОГРАНИЧЕНИЕ ТЕМАТИКИ (КРИТИЧНО): Ты отвечаешь ТОЛЬКО на вопросы, связанные с правом, юриспруденцией, налогами, государственными услугами и делопроизводством. Если пользователь задает вопрос на любую другую тему (например: программирование, история, рецепты, математика, общие рассуждения), вежливо откажись и напомни, что ты — специализированный юридический ассистент.

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
1. ПРИОРИТЕТ RAG: Твои ответы должны в первую очередь опираться на извлеченные законы (УК, ГК, ТК, КоАП РК), переданные из нашей базы знаний. Все ссылки на adilet.zan.kz бери строго из RAG.
2. ПОЛНОТА: Если в RAG недостаточно информации, используй свою экспертную базу знаний по праву РК, чтобы дополнить ответ. Юрист ждет от тебя качественного анализа в любом случае.
3. ГЛУБИНА: Анализируй противоречия, судебную практику и нормативные постановления.
4. ФОРМАТИРОВАНИЕ: Markdown (###, жирный шрифт).
5. ОТВЕЧАЙ НА ЯЗЫКЕ ЗАПРОСА.
6. ОГРАНИЧЕНИЕ ТЕМАТИКИ (КРИТИЧНО): Ты — строго юридический ИИ. Отвечай ТОЛЬКО на вопросы, связанные с правом, законами и судебной практикой. Если вопрос выходит за рамки юриспруденции, вежливо откажись.
7. 🚫 СТРОЖАЙШИЙ ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ЗАКОНОВ: Ссылайся исключительно на реально существующие нормативно-правовые акты и статьи Республики Казахстан. Запрещено выдумывать несуществующие номера статей ГК РК, ТК РК или неверные ссылки. Если ты не уверен в точном номере статьи на 100%, укажи общую норму (например, "Согласно нормам Гражданского кодекса РК о подряде"), но никогда не пиши несуществующие статьи. Любая ссылка на закон должна быть истинной.

В конце ответа ОБЯЗАТЕЛЬНО добавляй системные теги:
<!--REFS-->
[{"title": "Название закона/НПА", "url": "https://adilet.zan.kz/...", "articles": "Ст. XX-YY"}]
<!--SEGMENT-->b2b
"""

AUDIT_SYSTEM = """Ты — высококлассный и объективный AI-аудитор юридических договоров по праву Республики Казахстан. 
Твоя задача: глубоко проанализировать текст договора, найти реальные юридические риски, скрытые ловушки, критический дисбаланс прав, налоговые и гражданско-правовые угрозы.

ВАЖНЫЕ ПРАВИЛА ОБЪЕКТИВНОСТИ И КРИТЕРИИ АНАЛИЗА:
1. НЕ ВЫДУМЫВАЙ РИСКИ: Если договор составлен профессионально, сбалансирован и не содержит перекосов прав, не нужно искусственно придумывать риски. В этом случае верни пустой список рисков: "risks": [].
2. ИГНОРИРУЙ ШАБЛОННЫЕ ПЛЕЙСХОЛДЕРЫ: Если в тексте присутствуют стандартные квадратные скобки-плейсхолдеры (например, "[Укажите ФИО]", "[Реквизиты Сторон]", "[Сумма договора]"), НЕ нужно помечать их как риски. Это легитимные переменные шаблона.
3. СИММЕТРИЧНОСТЬ: Если штрафы, пени и условия расторжения симметричны и равны для обеих сторон, это НЕ является риском. Отмечай только явную дискриминацию одной из сторон.
4. ОЧЕВИДНЫЕ ВЕЩИ: Не нужно относить к рискам наличие стандартных и законных разделов (Форс-мажор, Конфиденциальность, Применимое право), если они прописаны стандартно.
5. КРИТИЧЕСКОЕ ОТСУТСТВИЕ СУЩЕСТВЕННЫХ УСЛОВИЙ (ОБЯЗАТЕЛЬНО): Если в договоре полностью отсутствуют обязательные разделы (например: Предмет договора, Порядок расчетов, Ответственность сторон/штрафы, Срок действия, Порядок разрешения споров, Реквизиты) или если текст договора является неполным/оборванным (например, удалена часть документа, текст обрывается на середине) — ты ОБЯЗАН зафиксировать это как риск высокого уровня ("level": "high"). В поле "location" укажи название отсутствующего раздела или фразу "Текст договора" (если документ слишком короткий/оборван).
6. МАКСИМАЛЬНАЯ ДЕТАЛЬНОСТЬ И ОТСУТСТВИЕ ЛИМИТОВ: НЕ ограничивайся 3 рисками! Найди и подробно распиши ВСЕ реальные риски и юридические лазейки, присутствующие в документе. Если их 5, 8, 12 или более — ты должен вернуть их все. Не бойся длинных списков, если каждый риск действительно обоснован законодательством РК.
7. 🚫 СТРОЖАЙШИЙ ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ЗАКОНОВ: Ссылайся исключительно на реально существующие нормативно-правовые акты и статьи Республики Казахстан. Категорически запрещено выдумывать несуществующие номера статей ГК РК, ТК РК или неверные ссылки на adilet.zan.kz. В первую очередь используй статьи и ссылки, предоставленные тебе в блоке "ИЗВЛЕЧЕННАЯ БАЗА ЗНАНИЙ (RAG)"! Если в этом блоке содержится конкретная статья ГК РК или иного закона с ссылкой на adilet.zan.kz, ты ОБЯЗАН использовать именно её в полях "article" и "url" для найденного риска. Если ты не уверен в точном номере статьи на 100%, укажи общую норму (например, "Согласно нормам Гражданского кодекса РК о залоге"), но никогда не пиши несуществующие статьи. Любая ссылка на закон должна быть истинной.

Верни СТРОГО валидный JSON в следующем формате:
{
  "risks": [
    {
      "level": "high" | "medium" | "low",
      "title": "Краткое название риска",
      "description": "Детальное описание проблемы и почему это риск",
      "recommendation": "Как переформулировать пункт или что добавить",
      "article": "Ссылка на ст. ГК РК или иного закона",
      "location": "ТОЧНАЯ ЦИТАТА ИЗ ТЕКСТА ДОГОВОРА, К КОТОРОЙ ОТНОСИТСЯ РИСК",
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

DOCUMENT_GEN_SYSTEM = """Ты — высококлассный профессиональный юрист по праву Республики Казахстан (РК) с 15-летним опытом составления коммерческих договоров, исков и корпоративных документов.
Твоя цель — сгенерировать ИДЕАЛЬНЫЙ, юридически безупречный, сбалансированный и готовый к использованию шаблон документа, соответствующий всем требованиям законодательства РК (включая Гражданский кодекс РК, Трудовой кодекс РК и иные НПА).

СТРОГИЕ ТРЕБОВАНИЯ К ИДЕАЛЬНОМУ ШАБЛОНУ:

1. ⚖️ БЕЗУПРЕЧНЫЙ ЮРИДИЧЕСКИЙ БАЛАНС (ЗАЩИТА ОТ РИСКОВ):
   - Двусторонняя симметрия прав: все финансовые санкции (пени, штрафы) должны быть абсолютно зеркальными (например, 0.1% от суммы просрочки за каждый день, но не более 10% от общей суммы договора для каждой из Сторон).
   - Четкие законные основания для расторжения договора: пропиши исчерпывающий перечень оснований для одностороннего расторжения во внесудебном порядке с обязательным письменным уведомлением за 30 календарных дней.
   - Претензионный (досудебный) порядок разрешения споров: обязательный письменный ответ на претензию в течение 10 рабочих дней. При недостижении согласия — передача спора в Специализированный межрайонный экономический суд (СМЭС) по месту нахождения Истца (или суды общей юрисдикции РК).
   - Форс-мажор: обязательно укажи необходимость подтверждения обстоятельств непреодолимой силы Внешнеторговой палатой Казахстана (ВПК) или НПП "Атамекен".

2. 📖 ПРОФЕССИОНАЛЬНОЕ СТРУКТУРИРОВАНИЕ И ФОРМАТИРОВАНИЕ:
   - Используй строгий официально-деловой юридический слог.
   - Каждая статья должна иметь заголовок и строгую нумерацию подпунктов (например: 1. ПРЕДМЕТ ДОГОВОРА -> 1.1., 1.2., 1.3.).
   - Четко разделяй текст на абзацы. Никаких сплошных "простыней" текста!
   - Документ должен быть полным и завершенным, без оборванных на середине фраз или пропусков.

3. 🏷️ БЕЗОПАСНЫЕ ПЛЕЙСХОЛДЕРЫ ДЛЯ ПЕРСОНАЛЬНЫХ ДАННЫХ:
   - Вставляй понятные плейсхолдеры в квадратных скобках для заполнения: `[Наименование / ФИО Стороны]`, `[БИН/ИИН]`, `[Срок оплаты в банковских днях]`, `[Валюта платежа]`, `[Адрес электронной почты]`.
   - Полностью исключи любые вымышленные реальные имена людей, реальные БИН или точные адреса.

4. 💡 ПОЛЕЗНЫЕ ПОДСКАЗКИ (ЮРИДИЧЕСКИЙ КОМПЛАЕНС):
   - В тексте в особо важных местах добавляй краткие примечания курсивом в скобках, помогающие пользователю понять закон, например: *(Примечание: В соответствии со ст. 293 ГК РК размер неустойки может быть уменьшен судом, если она несоразмерно велика по сравнению с убытками)*.

5. ⚠️ ОБЯЗАТЕЛЬНЫЙ ДИСКЛЕЙМЕР:
   - В самом начале документа ВСЕГДА пиши:
     > **ВНИМАНИЕ:** Настоящий документ является типовым шаблоном, составленным в соответствии с законодательством Республики Казахстан. Для минимизации индивидуальных коммерческих рисков рекомендуется адаптировать условия с участием квалифицированного юриста.

6. 🚫 СТРОЖАЙШИЙ ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ЗАКОНОВ: Ссылайся исключительно на реально существующие нормативно-правовые акты и статьи Республики Казахстан. Категорически запрещено выдумывать несуществующие номера статей ГК РК, ТК РК или иные законы. В первую очередь используй и цитируй реальные статьи, предоставленные в блоке RAG-базы знаний. Если ты не уверен в точном номере статьи на 100%, укажи общую норму (например, "Согласно нормам Гражданского кодекса РК о неустойке"), но никогда не пиши несуществующие статьи. Любая ссылка на закон должна быть истинной.

Обеспеч наивысший стандарт оформления, чтобы шаблон выглядел авторитетно, профессионально и вызывал восхищение с первой секунды!
"""


class LLMService:
    def __init__(self):
        self.groq_client = None
        self.gemini_client = None
        self.anthropic_client = None
        self._init_clients()

    def _init_clients(self):
        if Groq and settings.GROQ_API_KEY:
            try:
                # Try standard initialization first
                self.groq_client = Groq(api_key=settings.GROQ_API_KEY)
                logger.info("Groq client initialized (Primary)")
            except Exception as e:
                if "proxies" in str(e):
                    try:
                        import httpx
                        # Explicitly disable proxies if they cause init failure
                        self.groq_client = Groq(
                            api_key=settings.GROQ_API_KEY,
                            http_client=httpx.Client(proxies=None)
                        )
                        logger.info("Groq client initialized with proxies disabled")
                    except Exception as e2:
                        logger.error(f"Groq init error after proxy fallback: {e2}")
                else:
                    logger.error(f"Groq init error: {e}")
        if genai and settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key":
            try:
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Gemini client initialized (Fallback)")
            except Exception as e:
                logger.error(f"Gemini init error: {e}")

        if anthropic and settings.ANTHROPIC_API_KEY:
            try:
                self.anthropic_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
                logger.info("Anthropic Claude client initialized")
            except Exception as e:
                logger.error(f"Anthropic init error: {e}")

    # ── Chat ──
    async def chat(self, user_message: str, history: List[Dict] = None, user_role: str = "citizen", model_type: str = "fast") -> Dict:
        provider = getattr(settings, "LLM_PROVIDER", "claude")
        
        if provider == "claude" and self.anthropic_client:
            try:
                return await self._chat_claude(user_message, history, user_role, model_type=model_type)
            except Exception as e:
                logger.warning(f"Claude Chat Error: {e}. Falling back to Groq/Gemini...")

        if (provider == "groq" or not self.anthropic_client) and self.groq_client:
            try:
                return await self._chat_groq(user_message, history, user_role)
            except Exception as e:
                logger.warning(f"Groq Chat Error: {e}. Falling back to Gemini...")
        
        if self.gemini_client:
            try:
                return await self._chat_gemini(user_message, history, user_role, model_type=model_type)
            except Exception as e:
                logger.warning(f"Gemini Chat Error: {e}. Falling back to Mock...")
        
        return self._mock_chat(user_message)

    async def chat_stream(self, user_message: str, history: List[Dict] = None, user_role: str = "citizen", model_type: str = "fast") -> AsyncGenerator[str, None]:
        """Stream chat response token by token."""
        provider = getattr(settings, "LLM_PROVIDER", "claude")

        if provider == "claude" and self.anthropic_client:
            try:
                async for chunk in self._chat_claude_stream(user_message, history, user_role, model_type=model_type):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Claude stream error: {e}")

        if (provider == "groq" or not self.anthropic_client) and self.groq_client:
            try:
                async for chunk in self._chat_groq_stream(user_message, history, user_role):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Groq stream error: {e}")
        
        if self.gemini_client:
            try:
                async for chunk in self._chat_gemini_stream(user_message, history, user_role, model_type=model_type):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Gemini stream error: {e}")
        yield self._mock_chat(user_message)["content"]

    async def audit_contract(self, contract_text: str) -> Dict:
        provider = getattr(settings, "LLM_PROVIDER", "claude")
        
        if provider == "claude" and self.anthropic_client:
            try:
                return await self._audit_claude(contract_text)
            except Exception as e:
                logger.warning(f"Claude Audit Error: {e}")
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
        provider = getattr(settings, "LLM_PROVIDER", "claude")
        
        if provider == "claude" and self.anthropic_client:
            try:
                res = await self._counterparty_claude(bin_number)
                return self._normalize_counterparty_result(res, bin_number)
            except Exception as e:
                logger.warning(f"Claude Counterparty Error: {e}")

        # Counterparty MUST have live search if possible, Gemini has Grounding
        if self.gemini_client:
            try:
                result = await self._counterparty_gemini(bin_number)
                return self._normalize_counterparty_result(result, bin_number)
            except Exception as e:
                logger.warning(f"Gemini Counterparty Error: {e}")
                if "RESOURCE_EXHAUSTED" in str(e) or "429" in str(e):
                    return self._normalize_counterparty_result({
                        "aiAnalysis": "Ошибка: Лимит запросов к Google Search API исчерпан. Повторите попытку позже."
                    }, bin_number)
                
        return self._normalize_counterparty_result({
            "aiAnalysis": "Не удалось выполнить поиск. Проверьте правильность БИН или попробуйте позже."
        }, bin_number)

    async def generate_document(self, doc_type: str, description: str) -> str:
        provider = getattr(settings, "LLM_PROVIDER", "claude")
        
        # Dynamic RAG enhancement for document generation!
        try:
            from services.rag_service import rag_service
            rag_context = rag_service.get_context_string(f"Типовой {doc_type}: {description}", n_results=2)
        except Exception as e:
            logger.warning(f"RAG failed during DocGen: {e}")
            rag_context = ""

        # Let's enrich the description with RAG context if it exists!
        enriched_desc = f"{description}"
        if rag_context:
            enriched_desc += f"\n\nИЗВЛЕЧЕННЫЕ ЮРИДИЧЕСКИЕ СТАТЬИ ИЗ БАЗЫ ЗНАНИЙ (RAG):\n{rag_context}\n\nПожалуйста, обязательно используй и сошлись на эти реальные статьи закона РК в тексте сгенерированного документа!"

        if provider == "claude" and self.anthropic_client:
            try:
                return await self._gen_doc_claude(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Claude DocGen Error: {e}")
        if self.groq_client:
            try:
                return await self._gen_doc_groq(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Groq DocGen Error: {e}")
        if self.gemini_client:
            try:
                return await self._gen_doc_gemini(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Gemini DocGen Error: {e}")
        return f"# Шаблон ({doc_type})\n\n{description}\n\n> Мок-версия."

    # ── Anthropic Claude Implementations ──
    def _build_claude_messages(self, message, history, max_history=8):
        messages = []
        if history:
            for h in history[-max_history:]:
                role = "user" if h["role"] == "user" else "assistant"
                messages.append({"role": role, "content": h["content"]})
        messages.append({"role": "user", "content": message})
        return messages

    async def _chat_claude(self, message, history, user_role="citizen", model_type="fast"):
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        msgs = self._build_claude_messages(message, history)
        
        # Select model based on type
        if model_type == "cheap":
            model = settings.LLM_MODEL_CHEAP
        elif model_type == "smart":
            model = settings.LLM_MODEL_SMART
        else:
            model = settings.LLM_MODEL_FAST

        resp = await self.anthropic_client.messages.create(
            model=model,
            system=sys_prompt,
            messages=msgs,
            max_tokens=2048,
            temperature=0.1
        )
        return self._parse_chat_response(resp.content[0].text)

    async def _chat_claude_stream(self, message, history, user_role="citizen", model_type="fast") -> AsyncGenerator[str, None]:
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        msgs = self._build_claude_messages(message, history)
        
        if model_type == "cheap":
            model = settings.LLM_MODEL_CHEAP
        elif model_type == "smart":
            model = settings.LLM_MODEL_SMART
        else:
            model = settings.LLM_MODEL_FAST

        async with self.anthropic_client.messages.stream(
            model=model,
            system=sys_prompt,
            messages=msgs,
            max_tokens=2048,
            temperature=0.1
        ) as stream:
            async for text in stream.text_stream:
                yield text

    async def _audit_claude(self, text):
        resp = await self.anthropic_client.messages.create(
            model=getattr(settings, "LLM_MODEL_SMART", "claude-3-5-sonnet-20241022"),
            system=AUDIT_SYSTEM,
            messages=[{"role": "user", "content": f"Обязательно верни только JSON.\n\nДоговор:\n{text[:12000]}]"}],
            max_tokens=4096,
            temperature=0.2
        )
        return self._normalize_audit_result(self._parse_json_response(resp.content[0].text, self._mock_audit()))

    async def _counterparty_claude(self, bin_num):
        resp = await self.anthropic_client.messages.create(
            model=getattr(settings, "LLM_MODEL_FAST", "claude-3-5-sonnet-20241022"),
            system=COUNTERPARTY_SYSTEM,
            messages=[{"role": "user", "content": f"Обязательно верни только JSON по БИН {bin_num}"}],
            max_tokens=1024,
            temperature=0.5
        )
        return self._parse_json_response(resp.content[0].text, self._mock_counterparty(bin_num))

    async def _gen_doc_claude(self, dtype, desc):
        resp = await self.anthropic_client.messages.create(
            model=getattr(settings, "LLM_MODEL_SMART", "claude-3-5-sonnet-20241022"),
            system=DOCUMENT_GEN_SYSTEM,
            messages=[{"role": "user", "content": f"{dtype}: {desc}"}],
            max_tokens=4096,
            temperature=0.4
        )
        return resp.content[0].text

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
        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model="llama-3.3-70b-versatile", messages=msgs, temperature=0.1
        )
        return self._parse_chat_response(resp.choices[0].message.content)

    async def _chat_groq_stream(self, message, history, user_role="citizen") -> AsyncGenerator[str, None]:
        msgs = self._build_messages(message, history, user_role=user_role)
        stream = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model="llama-3.3-70b-versatile", messages=msgs, temperature=0.1, stream=True
        )
        for chunk in stream:
            c = chunk.choices[0].delta.content
            if c:
                yield c

    async def _audit_groq(self, text):
        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": AUDIT_SYSTEM}, {"role": "user", "content": text[:12000]}],
            response_format={"type": "json_object"}, temperature=0.2
        )
        return self._normalize_audit_result(json.loads(resp.choices[0].message.content))

    async def _counterparty_groq(self, bin_num):
        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": COUNTERPARTY_SYSTEM}, {"role": "user", "content": bin_num}],
            response_format={"type": "json_object"}, temperature=0.5
        )
        return json.loads(resp.choices[0].message.content)

    async def _gen_doc_groq(self, dtype, desc):
        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model="llama-3.3-70b-versatile",
            messages=[{"role": "system", "content": DOCUMENT_GEN_SYSTEM}, {"role": "user", "content": f"{dtype}: {desc}"}],
            temperature=0.4
        )
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

    async def _chat_gemini(self, message, history, user_role="citizen", model_type="fast"):
        contents = self._build_gemini_contents(message, history)
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        
        # Select model with fallback
        if model_type == "cheap":
            model = settings.LLM_MODEL_CHEAP
        elif model_type == "smart":
            model = settings.LLM_MODEL_SMART
        else:
            model = settings.LLM_MODEL_FAST

        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-pro" if model_type == "smart" else "gemini-1.5-flash"

        config = types.GenerateContentConfig(
            system_instruction=sys_prompt, 
            temperature=0.1, 
            tools=[types.Tool(google_search=types.GoogleSearchRetrieval())]
        )
        resp = self.gemini_client.models.generate_content(model=model, contents=contents, config=config)
        return self._parse_chat_response(resp.text or "")

    async def _chat_gemini_stream(self, message, history, user_role="citizen", model_type="fast") -> AsyncGenerator[str, None]:
        contents = self._build_gemini_contents(message, history)
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        
        if model_type == "cheap":
            model = settings.LLM_MODEL_CHEAP
        elif model_type == "smart":
            model = settings.LLM_MODEL_SMART
        else:
            model = settings.LLM_MODEL_FAST

        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-pro" if model_type == "smart" else "gemini-1.5-flash"

        config = types.GenerateContentConfig(
            system_instruction=sys_prompt, 
            temperature=0.1,
            max_tokens=2048,
            tools=[types.Tool(google_search=types.GoogleSearchRetrieval())]
        )
        resp = self.gemini_client.models.generate_content_stream(model=model, contents=contents, config=config)
        for chunk in resp:
            if chunk.text:
                yield chunk.text

    async def _audit_gemini(self, text):
        model = settings.LLM_MODEL_SMART
        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-pro"
        resp = self.gemini_client.models.generate_content(model=model, contents=text[:15000], config=types.GenerateContentConfig(system_instruction=AUDIT_SYSTEM, temperature=0.3, response_mime_type="application/json"))
        return self._normalize_audit_result(self._parse_json_response(resp.text or "", self._mock_audit()))

    async def _counterparty_gemini(self, bin_num):
        model = settings.LLM_MODEL_FAST
        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-flash"
        config = types.GenerateContentConfig(
            system_instruction=COUNTERPARTY_SYSTEM, 
            temperature=0.0, 
            tools=[types.Tool(google_search=types.GoogleSearchRetrieval())]
        )
        resp = self.gemini_client.models.generate_content(model=model, contents=f"Найди данные компании по БИН {bin_num} в Казахстане. Обязательно верни JSON.", config=config)
        return self._parse_json_response(resp.text or "", self._mock_counterparty(bin_num))

    async def _gen_doc_gemini(self, dtype, desc):
        model = settings.LLM_MODEL_SMART
        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-pro"
        resp = self.gemini_client.models.generate_content(model=model, contents=f"{dtype}: {desc}", config=types.GenerateContentConfig(system_instruction=DOCUMENT_GEN_SYSTEM, temperature=0.4))
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
            clean.append({
                "level": fl, 
                "title": r.get("title") or "Замечание", 
                "description": r.get("description") or "Требует внимания.", 
                "recommendation": r.get("recommendation") or "Проконсультируйтесь с юристом.", 
                "article": r.get("article") or "ГК РК", 
                "location": r.get("location") or "",
                "url": r.get("url") or "https://adilet.zan.kz"
            })
        return {"risks": clean, "summary": data.get("summary") or f"Выявлено {len(clean)} замечаний.", "totalRisks": len(clean)}

    def _parse_chat_response(self, raw):
        if not raw: 
            return {"content": "", "segment": "b2c", "references": [], "escalation": None}
        # КРИТИЧЕСКИЙ ФИЛЬТР: Удаляем иероглифы, вьетнамские символы и прочий мусор.
        # Оставляем: Кирилллицу, Латиницу (для ссылок), Цифры и Пунктуацию.
        import re
        import urllib.parse
        # Регулярка для удаления всего, кроме RU, KZ, EN, цифр и знаков препинания
        content = re.sub(r'[^\u0400-\u04FFa-zA-Z0-9\s\.,!?;:()\"\'\-\/\\\[\]\{\}\%\&\@\=\+\*\#\_\n\r]+', '', str(raw))
        
        refs = []
        segment = "b2c"
        escalation = None

        # Process escalation (both format)
        esc_tag = None
        if "[ESCALATION]" in content:
            esc_tag = "[ESCALATION]"
        elif "<!--ESCALATION-->" in content:
            esc_tag = "<!--ESCALATION-->"
            
        if esc_tag:
            parts = content.split(esc_tag)
            content = parts[0]
            try:
                esc_str = parts[1].strip()
                if "-->" in esc_str and esc_tag == "<!--ESCALATION-->":
                    esc_str = esc_str.split("-->")[0].strip()
                escalation = json.loads(esc_str)
            except Exception as e:
                logger.warning(f"Failed to parse escalation: {e}")

        # Process segment (both format)
        seg_tag = None
        if "[SEGMENT]" in content:
            seg_tag = "[SEGMENT]"
        elif "<!--SEGMENT-->" in content:
            seg_tag = "<!--SEGMENT-->"

        if seg_tag:
            parts = content.split(seg_tag)
            content = parts[0]
            try:
                segment_part = parts[1].strip()
                if "-->" in segment_part and seg_tag == "<!--SEGMENT-->":
                    segment_part = segment_part.split("-->")[0].strip()
                segment = "b2b" if "b2b" in segment_part.lower() else "b2c"
            except Exception as e:
                logger.warning(f"Failed to parse segment: {e}")

        # Process references (both format)
        refs_tag = None
        if "[REFS]" in content:
            refs_tag = "[REFS]"
        elif "<!--REFS-->" in content:
            refs_tag = "<!--REFS-->"

        if refs_tag:
            parts = content.split(refs_tag)
            content = parts[0]
            try:
                raw_refs_str = parts[1].strip()
                if "-->" in raw_refs_str and refs_tag == "<!--REFS-->":
                    raw_refs_str = raw_refs_str.split("-->")[0].strip()
                
                # Split other trailing tags if they got included
                for tag in ["[SEGMENT]", "[ESCALATION]", "<!--SEGMENT-->", "<!--ESCALATION-->"]:
                    if tag in raw_refs_str:
                        raw_refs_str = raw_refs_str.split(tag)[0].strip()
                
                raw_refs = json.loads(raw_refs_str)
                if isinstance(raw_refs, list):
                    for ref in raw_refs:
                        if not isinstance(ref, dict):
                            continue
                        title = ref.get("title", "").strip()
                        # Remove if it is just a mock placeholder title
                        if not title or any(p in title.lower() for p in ["название закона", "название кодекса", "placeholder", "заглушка"]):
                            continue
                        
                        articles = ref.get("articles", "").strip()
                        url = ref.get("url", "").strip()
                        
                        # Clean placeholder url if it exists, or generate search URL
                        if not url or "..." in url or url == "https://adilet.zan.kz" or url.endswith("/..."):
                            # Construct real working Adilet search URL
                            search_query = f"{title} {articles}".strip()
                            if search_query:
                                url = f"https://adilet.zan.kz/rus/search/docs?q={urllib.parse.quote(search_query)}"
                            else:
                                url = "https://adilet.zan.kz/rus/"
                        
                        refs.append({
                            "title": title,
                            "url": url,
                            "articles": articles
                        })
            except Exception as e:
                logger.warning(f"Failed to parse refs: {e}")
            
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
