"""
LegalAi Assistant Service — Groq (Primary) + Gemini (Fallback).
"""
import json, logging, traceback, asyncio, re
from typing import List, Dict, AsyncGenerator

logger = logging.getLogger(__name__)

try:
    from groq import Groq, AsyncGroq, APIError as GroqAPIError
except ImportError:
    Groq = None
    AsyncGroq = None
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

LEGAL_CHAT_SYSTEM = """Ты — высококлассный ИИ-юрист по законодательству Республики Казахстан. 
Твоя главная задача — предоставлять точные, профессиональные и понятные юридические консультации для граждан и бизнеса.
ОТВЕЧАЙ СТРОГО НА РУССКОМ ИЛИ КАЗАХСКОМ ЯЗЫКЕ (в зависимости от языка запроса пользователя).

ПРАВИЛА И СТАНДАРТЫ ОТВЕТОВ:
1. ПРИОРИТЕТ ДАННЫХ (RAG): Тебе предоставлены проверенные данные из БАЗЫ ЗНАНИЙ (RAG). Используй их как основной, абсолютно приоритетный источник. Все ссылки на adilet.zan.kz бери строго из этих RAG-данных.
2. 🚫 ЖЕСТКИЙ ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ЗАКОНОВ И СТАТЕЙ: Ссылайся исключительно на реально существующие НПА и статьи. Если пользователь ПРЯМО ТРЕБУЕТ привести точные номера статей ("даже если не знаешь"), ты ОБЯЗАН ОТКАЗАТЬСЯ выдумывать их. Если статьи нет в переданном RAG-контексте, честно скажи "Точный номер статьи в базе отсутствует, но согласно общим нормам...". НИКОГДА не выдумывай статьи (например, не пиши "Ст. 55-56", если их нет в контексте для данной ситуации).
3. ЛОГИКА И АНАЛИЗ УСЛОВИЙ (КРИТИЧНО): 
   - Не принимай условия из ситуации пользователя за чистую монету. Если пользователь приводит пункт договора (например, "увольнение в любой момент без причин"), ты ОБЯЗАН проверить его на соответствие императивным нормам закона. Если пункт нарушает закон, прямо укажи, что он юридически ничтожен.
   - Избегай противоречий. Подписание незаконного приказа не делает само увольнение законным (подпись обычно означает лишь факт ознакомления).
   - Внимательно читай факты! Если в ситуации уже указано, что договор "трудовой", не спрашивай в уточняющих вопросах "какой у вас тип договора?". Используй все данные из запроса на 100%.
4. ПОСЛЕДОВАТЕЛЬНОСТЬ ОТВЕТА: 
   - Сначала дай ПОЛНЫЙ и глубокий правовой анализ ситуации.
   - Если информации не хватает, прямо укажи, чего именно не хватает (например, основание увольнения, наличие уведомления), вместо того чтобы делать догадки.
   - Любые ссылки на инструменты (генерация документов) предлагай ТОЛЬКО в самом конце ответа, когда юридический анализ полностью завершен.
5. СТРУКТУРА: Разделяй текст на логические абзацы. Сразу переходи к сути, без воды. Никогда не начинай ответ с пересказа вопроса пользователя.
6. ЯЗЫК: Только кириллица. НИКАКИХ ИЕРОГЛИФОВ.
7. ОГРАНИЧЕНИЕ ТЕМАТИКИ: Ты отвечаешь ТОЛЬКО на вопросы, связанные с правом, налогами и госуслугами РК.
8. УТОЧНЯЮЩИЕ ВОПРОСЫ: Задавай 1-2 вопроса ТОЛЬКО если без них совершенно невозможно дать полезную консультацию, и ТОЛЬКО о тех фактах, которых реально нет в тексте запроса.
9. ПРОВЕРКА КОНТРАГЕНТОВ: Если пользователь хочет проверить компанию, дай ссылку: [Перейти в раздел Проверка контрагентов](/dashboard/counterparty).
10. ПРАКТИЧЕСКИЕ СОВЕТЫ И ЗАЩИТА: ВСЕГДА (если это уместно) напоминай пользователю о:
    - Сроках исковой давности (например, 3 месяца по трудовым спорам, 3 года по общим и т.д.), чтобы они не упустили время.
    - Важности сохранения доказательств (нотариальное заверение переписок WhatsApp, скриншоты, аудиозаписи, акты, чеки).
    - Внесудебных инстанциях для защиты помимо суда (Государственная инспекция труда, E-otinish, прокуратура, досудебная претензия).
11. ГЕНЕРАЦИЯ ДОКУМЕНТОВ: Предлагай строго в конце анализа.
СТРОГИЙ ШАБЛОН ССЫЛКИ (скопируй его и подставь свои значения):
[📝 Сгенерировать документ](/dashboard/documents?generate=ТИП&desc=ОПИСАНИЕ)
ТИП: contract, claim, complaint или statement.
ОПИСАНИЕ: краткая суть проблемы со всеми деталями, именами и суммами (замени пробелы на +).

ФОРМАТ ЗАВЕРШЕНИЯ (ОБЯЗАТЕЛЬНО ДОБАВЛЯЙ В САМОМ КОНЦЕ ОТВЕТА СКРЫТЫЕ БЛОКИ ДЛЯ ПАРСИНГА):

[REFS]
[{"title": "Название закона/Кодекса", "url": "https://adilet.zan.kz/...", "articles": "Ст. XX-YY", "snippet": "Краткая суть ИМЕННО ЭТОЙ статьи, о чем она говорит (1-2 предложения, не пиши про закон в целом)"}]

[SEGMENT]
b2c (если вопрос от физлица) ИЛИ b2b (если вопрос от бизнеса)

[ESCALATION]
{"needed": false, "reason": "...", "category": "..."}
ПРАВИЛА ЭСКАЛАЦИИ (КОГДА needed = true):
- Если пользователь ЯВНО просит найти/дать адвоката, юриста, связать с живым специалистом — ВСЕГДА ставь true.
- Если вопрос слишком сложный, уголовный, требует судебного представительства — ставь true.
В поле "category" укажи специализацию: "Гражданское право", "Уголовное право", "Трудовое право" и т.д.
В поле "reason" кратко объясни, почему рекомендуется живой юрист.

[SUGGESTIONS]
["Каковы мои риски?", "Как исправить этот пункт?", "Нужна помощь адвоката"]
КРИТИЧЕСКОЕ ПРАВИЛО: БЛОК [SUGGESTIONS] ОБЯЗАТЕЛЕН В 100% ТВОИХ ОТВЕТОВ! Сгенерируй строго 3 коротких варианта продолжения диалога со стороны пользователя (максимум 5-6 слов). Они должны быть внутри JSON массива.
🚫 ЗАПРЕЩЕНО выводить подсказки в виде обычного текста в самом теле ответа.
"""

LAWYER_CHAT_SYSTEM = """Ты — элитный AI-ассистент для профессиональных юристов и адвокатов РК.
Твоя цель — ускорить и облегчить работу юриста: анализ сложных прецедентов, подготовка стратегий, глубокий анализ законодательства РК.

ПРАВИЛА И СТАНДАРТЫ ОТВЕТОВ:
1. ПРИОРИТЕТ RAG: Твои ответы должны в первую очередь опираться на извлеченные законы (УК, ГК, ТК, КоАП РК), переданные из нашей базы знаний. Все ссылки на adilet.zan.kz бери строго из RAG.
2. 🚫 ЖЕСТКИЙ ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ЗАКОНОВ И СТАТЕЙ: Ссылайся исключительно на реально существующие НПА и статьи. Если пользователь ПРЯМО ТРЕБУЕТ привести точные номера статей ("даже если не знаешь"), ты ОБЯЗАН ОТКАЗАТЬСЯ выдумывать их. НИКОГДА не выдумывай статьи. Если ты не уверен в точном номере статьи на 100%, укажи общую норму (например, "Согласно нормам Гражданского кодекса РК о подряде").
3. ЛОГИКА И АНАЛИЗ УСЛОВИЙ (КРИТИЧНО): 
   - Не принимай условия из ситуации пользователя за чистую монету. Обязательно проверяй пункты договоров на соответствие императивным нормам закона (например, ничтожность условий, ухудшающих положение работника).
   - Избегай противоречий. Логика должна быть безупречной и последовательной.
   - Внимательно читай факты из запроса, не проси уточнять то, что уже дано.
4. ПОСЛЕДОВАТЕЛЬНОСТЬ ОТВЕТА: 
   - Сначала дай ПОЛНЫЙ и глубокий правовой анализ ситуации (анализируй противоречия, судебную практику).
   - Если информации не хватает, прямо укажи, чего именно не хватает, вместо догадок.
   - Ссылки на инструменты (генерация документов) предлагай ТОЛЬКО в самом конце.
5. ФОРМАТИРОВАНИЕ: Markdown (###, жирный шрифт). 🚫 ЗАПРЕТ: Избегай шаблонных и водянистых заголовков вроде "Правовая оценка ситуации".
6. 🚫 ЗАПРЕТ НА ТАВТОЛОГИЮ: Ни в коем случае не пересказывай суть вопроса в начале ответа. Юристам нужны сразу выводы.
7. ОТВЕЧАЙ НА ЯЗЫКЕ ЗАПРОСА.
8. ОГРАНИЧЕНИЕ ТЕМАТИКИ: Отвечай ТОЛЬКО на вопросы, связанные с правом, законами и судебной практикой.
9. УТОЧНЯЮЩИЕ ВОПРОСЫ И СУТЬ: Задавай 1-2 вежливых уточняющих вопроса ТОЛЬКО о тех деталях (стадия процесса, наличие доказательств), которых реально не хватает в тексте.
10. ГЕНЕРАЦИЯ ДОКУМЕНТОВ И ПРОВЕРКА КОНТРАГЕНТОВ:
Предлагай строго в конце анализа:
[📝 Сгенерировать иск](/dashboard/documents?generate=claim&desc=Иск+о+взыскании...)
[Перейти в раздел Проверка контрагентов](/dashboard/counterparty)

В конце ответа ОБЯЗАТЕЛЬНО добавляй системные теги:
<!--REFS-->
[{"title": "Название закона/НПА", "url": "https://adilet.zan.kz/...", "articles": "Ст. XX-YY", "snippet": "Краткая суть ИМЕННО ЭТОЙ статьи (о чем она говорит)"}]
<!--SEGMENT-->b2b
<!--SUGGESTIONS-->
["Какие документы нужны?", "Как долго идет регистрация?", "Какая стоимость услуги?"]
КРИТИЧЕСКОЕ ПРАВИЛО: ТЕГ <!--SUGGESTIONS--> И МАССИВ С ПОДСКАЗКАМИ ОБЯЗАТЕЛЕН В 100% ТВОИХ ОТВЕТОВ!
Сгенерируй строго 3 коротких кликабельных подсказки продолжения диалога со стороны пользователя (максимум 5-6 слов).
🚫 ЗАПРЕЩЕНО выводить подсказки в виде обычного текста в самом теле ответа.
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
8. ОТСЕВ НЕЮРИДИЧЕСКИХ ДОКУМЕНТОВ: Если предоставленный текст явно не является юридическим договором, соглашением, иском или доверенностью (например, это справка о компании, резюме, статья, личное письмо), НЕ вычисляй никакие риски. Сразу верни пустой список "risks": [] и в поле "summary" четко напиши, что документ не является правовым и аудит не применим.
9. 🚫 ЯЗЫК ОТВЕТА: ОТВЕЧАЙ ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ. СТРОЖАЙШЕ ЗАПРЕЩЕНО использовать китайские иероглифы или другие языки при формировании JSON.

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

DOCUMENT_GEN_SYSTEM = """Ты — высококлассный профессиональный юрист по праву Республики Казахстан (РК) с 15-летним опытом составления договоров, исков, жалоб и корпоративных документов.
Твоя цель — сгенерировать ИДЕАЛЬНЫЙ, юридически безупречный, сбалансированный и готовый к использованию шаблон документа, соответствующий всем требованиям законодательства РК (ГК РК, ТК РК, ГПК РК и т.д.).

СТРОГИЕ ТРЕБОВАНИЯ К ИДЕАЛЬНОМУ ШАБЛОНУ:

1. ⚖️ СТРУКТУРА ДОКУМЕНТА (СТРОГО АДАПТИРУЙ ПОД ТИП):
   - Если это ДОГОВОР: Двусторонняя симметрия прав, предмет, порядок расчетов, права и обязанности, ответственность сторон (штрафы), форс-мажор, порядок расторжения, реквизиты.
   - Если это ПРЕТЕНЗИЯ ИЛИ ЖАЛОБА: Шапка (Кому, От кого), описательная часть (суть нарушения на основе ситуации пользователя), мотивировочная часть (ссылки на нормы), просительная часть (требования), срок для ответа, последствия неисполнения (обращение в суд/органы), подпись.
   - Если это ИСКОВОЕ ЗАЯВЛЕНИЕ: Шапка (наименование суда, Истец, Ответчик, цена иска), описательная часть (суть спора), мотивировочная часть (ссылки на статьи ГК/ГПК РК), просительная часть ("Прошу суд:"), перечень приложений, подпись.
   - Если это ОФИЦИАЛЬНОЕ ЗАЯВЛЕНИЕ: Шапка (в какой орган), суть просьбы или уведомления, дата, подпись.
   КРИТИЧНО: Категорически запрещено использовать структуру "договора" (разделы "Предмет", "Ответственность сторон"), если пользователь просит составить претензию, жалобу или иск! Подстраивай структуру строго под тип документа и ситуацию пользователя.

2. 📖 ПРОФЕССИОНАЛЬНОЕ СТРУКТУРИРОВАНИЕ И ФОРМАТИРОВАНИЕ:
   - Используй строгий официально-деловой юридический слог.
   - Четко разделяй текст на абзацы и нумеруй пункты.
   - Документ должен быть полным, без оборванных фраз или пропусков.

3. 🏷️ БЕЗОПАСНЫЕ ПЛЕЙСХОЛДЕРЫ ДЛЯ ПЕРСОНАЛЬНЫХ ДАННЫХ:
   - Вставляй понятные плейсхолдеры в квадратных скобках для заполнения: `[Наименование / ФИО]`, `[БИН/ИИН]`, `[Адрес]`.
   - Полностью исключи вымышленные реальные имена людей или точные адреса.

4. 💡 ПОЛЕЗНЫЕ ПОДСКАЗКИ (ЮРИДИЧЕСКИЙ КОМПЛАЕНС):
   - В тексте в особо важных местах добавляй примечания курсивом в скобках, помогающие пользователю, например: *(Примечание: В соответствии со ст. 293 ГК РК размер неустойки может быть уменьшен судом)*.

5. ⚠️ ОБЯЗАТЕЛЬНЫЙ ДИСКЛЕЙМЕР:
   - В самом начале документа ВСЕГДА пиши:
     > **ВНИМАНИЕ:** Настоящий документ является типовым шаблоном, составленным ИИ в соответствии с законодательством Республики Казахстан. Рекомендуется адаптировать условия с участием квалифицированного юриста.

6. 🚫 СТРОЖАЙШИЙ ЗАПРЕТ НА ГАЛЛЮЦИНАЦИИ ЗАКОНОВ: Ссылайся исключительно на реально существующие законы РК. Используй реальные статьи из блока RAG-базы знаний.

Обеспеч наивысший стандарт оформления, чтобы шаблон выглядел авторитетно и профессионально!
7. 🚫 ЯЗЫК ОТВЕТА: ОТВЕЧАЙ ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ. СТРОЖАЙШЕ ЗАПРЕЩЕНО использовать китайские иероглифы или другие языки!
"""

QUICK_FIX_SYSTEM_FULL = """Ты — опытный юрист-редактор по праву Республики Казахстан. 
Твоя задача — исправить конкретный юридический риск в предоставленном тексте договора.
Тебе будет передан полный текст договора и описание риска (включая рекомендации по устранению).
Внеси необходимые точечные изменения в текст договора.
Верни ПОЛНЫЙ текст договора с уже внесенными исправлениями. Никаких дополнительных комментариев, только финальный текст документа.
ВАЖНО: ОТВЕЧАЙ ИСКЛЮЧИТЕЛЬНО НА РУССКОМ ЯЗЫКЕ. Запрещено использовать китайские иероглифы!"""

QUICK_FIX_SYSTEM_PARTIAL = """Ты — опытный юрист-редактор. 
Тебе передан проблемный фрагмент договора и описание риска. 
Твоя задача: переписать ЭТОТ ФРАГМЕНТ так, чтобы устранить риск согласно рекомендациям.
ВАЖНО: ВЕРНИ ТОЛЬКО ИСПРАВЛЕННЫЙ ФРАГМЕНТ ТЕКСТА. Никаких вводных слов, извинений или пояснений. Без кавычек, если их не было.
КРИТИЧНО: СОХРАНЯЙ ОРИГИНАЛЬНУЮ НУМЕРАЦИЮ ПУНКТА И ЕГО ОФОРМЛЕНИЕ! Если фрагмент начинался с "4.1.", твой ответ тоже должен начинаться с "4.1.".
ЯЗЫК ОТВЕТА ИСКЛЮЧИТЕЛЬНО РУССКИЙ. Запрещено использовать китайские иероглифы!"""

QUICK_FIX_SYSTEM_ADD = """Ты — опытный юрист-редактор.
В договоре отсутствует важное условие или раздел. Тебе передано описание риска.
Твоя задача: сгенерировать НОВЫЙ РАЗДЕЛ ИЛИ ПУНКТ договора, который закроет этот риск.
ВАЖНО: Если уместно, присвой новому пункту номер (например, "4.5." или "8."), логически подходящий для договора.
ВЕРНИ ТОЛЬКО ТЕКСТ НОВОГО ПУНКТА/РАЗДЕЛА. Никаких вводных слов, извинений или пояснений.
ЯЗЫК ОТВЕТА ИСКЛЮЧИТЕЛЬНО РУССКИЙ. Запрещено использовать китайские иероглифы!"""



MOCK_COMPANIES = {
    "123456789012": {
        "companyName": "ТОО 'КазТрансГаз'",
        "bin": "123456789012",
        "status": "Действующее",
        "registrationDate": "15.08.2001",
        "director": "Иванов Иван Иванович",
        "address": "г. Астана, ул. Сыганак, 25",
        "activity": "Транспортировка газа",
        "employees": "100-250",
        "taxDebt": "0 ₸",
        "riskLevel": "Низкий",
        "aiAnalysis": "Надежная компания, нет налоговых задолженностей и судов."
    },
    "987654321098": {
        "companyName": "ТОО 'Рога и Копыта'",
        "bin": "987654321098",
        "status": "Бездействующее",
        "registrationDate": "01.04.2020",
        "director": "Петров Петр Петрович",
        "address": "г. Алматы, ул. Абая, 1",
        "activity": "Прочая деятельность",
        "employees": "до 5",
        "taxDebt": "1 500 000 ₸",
        "riskLevel": "Высокий",
        "aiAnalysis": "Высокий риск. Компания имеет значительные налоговые задолженности и бездействует."
    }
}

class LLMService:

    def __init__(self):
        self.groq_client = None
        self.async_groq_client = None
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
            if AsyncGroq and settings.GROQ_API_KEY:
                try:
                    self.async_groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)
                    logger.info("Groq async client initialized")
                except Exception as e:
                    logger.error(f"Groq async init error: {e}")
        if genai and settings.GEMINI_API_KEY and settings.GEMINI_API_KEY != "your-gemini-api-key":
            try:
                self.gemini_client = genai.Client(api_key=settings.GEMINI_API_KEY)
                logger.info("Gemini client initialized (Fallback)")
            except Exception as e:
                logger.error(f"Gemini init error: {e}")

        if anthropic and settings.ANTHROPIC_API_KEY:
            try:
                if getattr(settings, "ANTHROPIC_BASE_URL", ""):
                    self.anthropic_client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY, base_url=settings.ANTHROPIC_BASE_URL)
                else:
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
                logger.warning(f"Claude Chat Error: {e}. Falling back to Gemini/Groq...")

        if provider == "gemini" and self.gemini_client:
            try:
                return await self._chat_gemini(user_message, history, user_role, model_type=model_type)
            except Exception as e:
                logger.warning(f"Gemini Chat Error: {e}. Falling back to Groq...")

        if self.groq_client:
            try:
                return await self._chat_groq(user_message, history, user_role)
            except Exception as e:
                logger.warning(f"Groq Chat Error: {e}. Falling back...")
        
        if self.gemini_client and provider != "gemini":
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

        if provider == "gemini" and self.gemini_client:
            try:
                async for chunk in self._chat_gemini_stream(user_message, history, user_role, model_type=model_type):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Gemini stream error: {e}")

        if self.groq_client:
            try:
                async for chunk in self._chat_groq_stream(user_message, history, user_role):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Groq stream error: {e}")
        
        if self.gemini_client and provider != "gemini":
            try:
                async for chunk in self._chat_gemini_stream(user_message, history, user_role, model_type=model_type):
                    yield chunk
                return
            except Exception as e:
                logger.warning(f"Gemini stream error: {e}")
                
        yield self._mock_chat(user_message)["content"]

    async def audit_contract(self, contract_text: str) -> Dict:
        provider = getattr(settings, "LLM_PROVIDER", "gemini")
        
        # 1. Try configured provider first
        if provider == "claude" and self.anthropic_client:
            try:
                return await self._audit_claude(contract_text)
            except Exception as e:
                logger.warning(f"Claude Audit Error: {e}")
        elif provider == "groq" and self.groq_client:
            try:
                return await self._audit_groq(contract_text)
            except Exception as e:
                logger.warning(f"Groq Audit Error: {e}")
        elif provider == "gemini" and self.gemini_client:
            try:
                return await self._audit_gemini(contract_text)
            except Exception as e:
                logger.warning(f"Gemini Audit Error: {e}")

        # 2. Fallbacks if the preferred provider failed or isn't available
        if self.gemini_client:
            try:
                return await self._audit_gemini(contract_text)
            except Exception as e:
                logger.warning(f"Gemini Audit Fallback Error: {e}")
        if self.groq_client:
            try:
                return await self._audit_groq(contract_text)
            except Exception as e:
                logger.warning(f"Groq Audit Fallback Error: {e}")
        if self.anthropic_client:
            try:
                return await self._audit_claude(contract_text)
            except Exception as e:
                logger.warning(f"Claude Audit Fallback Error: {e}")
                
        return self._mock_audit()

    async def check_counterparty(self, bin_number: str) -> Dict:
        # Check mock DB first
        if bin_number in MOCK_COMPANIES:
            return MOCK_COMPANIES[bin_number]
            
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
        
        # Override provider to Gemini for long texts if provider is Groq to avoid TPM Rate Limits
        if provider == "groq" and len(description) > 3000:
            logger.info("Description too long for Groq (TPM limits). Overriding provider to Gemini.")
            provider = "gemini"
            
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

        doc_content = ""
        # 1. Try configured provider first
        if provider == "claude" and self.anthropic_client:
            try:
                doc_content = await self._gen_doc_claude(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Claude DocGen Error: {e}")
        elif provider == "groq" and self.groq_client:
            try:
                doc_content = await self._gen_doc_groq(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Groq DocGen Error: {e}")
        elif provider == "gemini" and self.gemini_client:
            try:
                doc_content = await self._gen_doc_gemini(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Gemini DocGen Error: {e}")
                
        # 2. Fallbacks if preferred provider fails or isn't available
        if not doc_content and self.gemini_client:
            try:
                doc_content = await self._gen_doc_gemini(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Gemini DocGen Fallback Error: {e}")
        if not doc_content and self.groq_client:
            try:
                doc_content = await self._gen_doc_groq(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Groq DocGen Fallback Error: {e}")
        if not doc_content and self.anthropic_client:
            try:
                doc_content = await self._gen_doc_claude(doc_type, enriched_desc)
            except Exception as e:
                logger.warning(f"Claude DocGen Fallback Error: {e}")
                
        if not doc_content:
            return f"# Шаблон ({doc_type})\n\n{description}\n\n> Мок-версия."
            
        import re
        # Clean up any prompt leakage from the generated text
        doc_content = re.sub(r"(?i)Исправленный договор на основе аудита.*?ТЕКСТ ДОГОВОРА С ПРАВКАМИ ПОЛЬЗОВАТЕЛЯ:\s*", "", doc_content, flags=re.DOTALL)
        doc_content = re.sub(r"(?i)ВНИМАНИЕ: Сгенерируй финальный исправленный договор.*?\n\n", "", doc_content, flags=re.DOTALL)
        
        disclaimer = "> **ВНИМАНИЕ: ДАННЫЙ ШАБЛОН СГЕНЕРИРОВАН ИИ.** Не является окончательным юридическим документом и требует дополнительной проверки.\n\n"
        return disclaimer + doc_content.strip()

    def _insert_new_clause(self, contract_text: str, new_clause: str) -> str:
        """Intelligently inserts a new clause based on its numeric prefix (e.g. 2.3.2) or before signatures."""
        import re
        
        # Clean the new clause of surrounding quotes which prevent numeric prefix parsing
        new_clause = new_clause.strip().strip('"').strip("'").strip()
        
        # 1. Try to extract the numeric prefix from the generated clause
        prefix_match = re.match(r'^\s*(\d+(?:\.\d+)*)\.?', new_clause)
        
        # 2. Parse all numeric prefixes in the contract
        lines = contract_text.split('\n')
        headers = []
        requisites_line_idx = -1
        act_line_idx = -1
        total_lines = len(lines)
        
        for i, line in enumerate(lines):
            # Check for Act of Acceptance anywhere in the line (must be in second half and not a mention)
            if act_line_idx == -1 and i > total_lines * 0.5 and re.search(r'(?i)Акт\s+приема-передачи', line):
                if not re.search(r'(?i)(?:подписать|передать|сдать|подписания)', line):
                    act_line_idx = i
                
            # Check for requisites / signatures section
            if requisites_line_idx == -1 and re.search(r'(?i)(?:адреса|реквизиты|юридические\s+адреса|подписи|подписи\s+сторон)', line):
                # Only if it's not inside the Act (meaning before the Act line if Act exists)
                if act_line_idx == -1 or i < act_line_idx:
                    requisites_line_idx = i
            
            # Matches "1.Предмет", "2.1.2. Обязанности"
            m = re.match(r'^\s*(\d+(?:\.\d+)*)\.?(?:\s+|[А-ЯA-ZЁёА-я])', line)
            if m:
                parts = m.group(1).split('.')
                if len(parts) <= 4 and int(parts[0]) < 100:  # Ignore weird long IPs or years
                    headers.append((tuple(int(x) for x in parts), i))
        
        insert_line_idx = -1
        
        if prefix_match:
            new_prefix_str = prefix_match.group(1)
            new_prefix_tuple = tuple(int(x) for x in new_prefix_str.split('.'))
            
            # 3. Find the exact insertion point hierarchically
            if headers:
                for q_tuple, q_line_idx in headers:
                    # If this header is greater or equal to our new header, we insert before it
                    if q_tuple >= new_prefix_tuple:
                        insert_line_idx = q_line_idx
                        break
                        
        # 4. If no hierarchical point found, try to insert before the Requisites section
        if insert_line_idx == -1 and requisites_line_idx != -1:
            insert_line_idx = requisites_line_idx
            
        # 5. If still not found, try to insert before the Act of Acceptance
        if insert_line_idx == -1 and act_line_idx != -1:
            insert_line_idx = act_line_idx
            
        # If we have an insertion line index, insert there!
        if insert_line_idx != -1:
            lines.insert(insert_line_idx, "")
            lines.insert(insert_line_idx, new_clause.strip())
            lines.insert(insert_line_idx, "")
            return '\n'.join(lines)
            
        # 6. Absolute Fallback: Insert before signatures/requisites using regex
        pattern = r"(?i)(\n\s*(?:(?:1\d|[7-9])\.\s*)?(?:адреса|реквизиты|юридические\s+адреса|подписи|подписи\s+сторон)\s*(?:и\s+реквизиты\s+)?(?:сторон)?\s*\n)"
        match = re.search(pattern, contract_text)
        if match:
            insert_pos = match.start()
            return contract_text[:insert_pos] + f"\n\n{new_clause}\n\n" + contract_text[insert_pos:]
            
        # Last fallback: 3 non-empty lines from bottom
        lines = contract_text.rstrip().split('\n')
        non_empty = [i for i, line in enumerate(lines) if line.strip()]
        if len(non_empty) > 5:
            insert_idx = non_empty[-3]
            return '\n'.join(lines[:insert_idx]) + f"\n\n{new_clause}\n\n" + '\n'.join(lines[insert_idx:])
            
        return contract_text + "\n\n" + new_clause

    async def quick_fix_risk(self, contract_text: str, risk_title: str, risk_description: str, risk_recommendation: str, location: str) -> str:
        provider = getattr(settings, "LLM_PROVIDER", "claude")
        
        # 1. Determine strategy: REPLACE fragment, ADD new section, or FULL rewrite
        strategy = "FULL"
        prompt = ""
        sys_prompt = QUICK_FIX_SYSTEM_FULL
        
        import re
        # Clean location to improve matching
        clean_loc = location.strip()
        is_missing_section = not clean_loc or clean_loc.lower() == "текст договора" or clean_loc.lower() == "отсутствует"
        
        # Try exact match first
        found_exact = clean_loc in contract_text
        match_start = -1
        match_end = -1
        
        if not found_exact and not is_missing_section and len(clean_loc) > 10:
            # Try fuzzy match by removing all whitespaces
            clean_loc_no_space = re.sub(r'\s+', '', clean_loc)
            contract_no_space = re.sub(r'\s+', '', contract_text)
            idx = contract_no_space.find(clean_loc_no_space)
            if idx != -1:
                # We found a fuzzy match. We can't easily extract the exact original bounds with just string methods,
                # but we can fallback to FULL rewrite, or we can use a regex to find it in the original text.
                # A simple regex pattern that allows flexible whitespace between characters:
                pattern = r'\s*'.join(re.escape(c) for c in clean_loc_no_space[:50]) # use first 50 chars to find it
                match = re.search(pattern, contract_text)
                if match:
                    # found the start!
                    found_exact = True
                    # Let's just use the exact substring from the contract text
                    # We need the full length.
                    full_pattern = r'\s*'.join(re.escape(c) for c in clean_loc_no_space)
                    full_match = re.search(full_pattern, contract_text)
                    if full_match:
                        clean_loc = full_match.group(0)
        
        if not is_missing_section and found_exact and len(clean_loc) > 10:
            strategy = "PARTIAL"
            sys_prompt = QUICK_FIX_SYSTEM_PARTIAL
            prompt = f"Риск: {risk_title}\nОписание: {risk_description}\nРекомендация: {risk_recommendation}\n\nПЕРЕПИШИ СЛЕДУЮЩИЙ ФРАГМЕНТ:\n{clean_loc}"
        elif is_missing_section:
            strategy = "ADD"
            sys_prompt = QUICK_FIX_SYSTEM_ADD
            prompt = f"Риск: {risk_title}\nОписание: {risk_description}\nРекомендация: {risk_recommendation}\n\nСГЕНЕРИРУЙ НОВЫЙ ПУНКТ/РАЗДЕЛ ДЛЯ ДОБАВЛЕНИЯ В ДОГОВОР."
        else:
            # Fallback to ADD if we can't safely target a substring, replacing FULL rewrite to prevent destroying the contract
            strategy = "ADD"
            sys_prompt = QUICK_FIX_SYSTEM_ADD
            prompt = f"Риск: {risk_title}\nОписание: {risk_description}\nРекомендация: {risk_recommendation}\nОригинальный фрагмент (если есть): {location}\n\nСГЕНЕРИРУЙ НОВЫЙ ПУНКТ ИЛИ РАЗДЕЛ, КОТОРЫЙ ЗАКРОЕТ ЭТОТ РИСК (ЕГО НУЖНО БУДЕТ ДОБАВИТЬ В ДОГОВОР)."

        llm_response = ""

        # 2. Call LLM
        if provider == "claude" and self.anthropic_client:
            try:
                resp = await self.anthropic_client.messages.create(
                    model=getattr(settings, "LLM_MODEL_FAST", "claude-3-5-sonnet-20241022"),
                    system=sys_prompt,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=4096,
                    temperature=0.1
                )
                if hasattr(resp, 'usage') and resp.usage:
                    logger.info(f"[TOKEN USAGE - CLAUDE QUICK FIX ({strategy})] Input: {resp.usage.input_tokens}, Output: {resp.usage.output_tokens}")
                llm_response = self._extract_claude_text(resp.content)
            except Exception as e:
                logger.warning(f"Claude Quick Fix Error: {e}")
        elif provider == "groq" and self.groq_client:
            try:
                resp = await asyncio.to_thread(
                    self.groq_client.chat.completions.create,
                    model=getattr(settings, "GROQ_MODEL_FAST", "llama-3.1-8b-instant"),
                    messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": prompt}],
                    temperature=0.1
                )
                if hasattr(resp, 'usage') and resp.usage:
                    logger.info(f"[TOKEN USAGE - GROQ QUICK FIX ({strategy})] Prompt: {resp.usage.prompt_tokens}, Completion: {resp.usage.completion_tokens}, Total: {resp.usage.total_tokens}")
                llm_response = resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"Groq Quick Fix Error: {e}")
        elif provider == "gemini" and self.gemini_client:
            try:
                model = settings.LLM_MODEL_FAST
                if not model or not model.startswith("gemini-"):
                    model = "gemini-1.5-flash"
                resp = self.gemini_client.models.generate_content(
                    model=model, 
                    contents=prompt, 
                    config=types.GenerateContentConfig(system_instruction=sys_prompt, temperature=0.1)
                )
                if hasattr(resp, 'usage_metadata') and resp.usage_metadata:
                    u = resp.usage_metadata
                    logger.info(f"[TOKEN USAGE - GEMINI QUICK FIX ({strategy})] Prompt: {u.prompt_token_count}, Candidates: {u.candidates_token_count}, Total: {u.total_token_count}")
                llm_response = resp.text
            except Exception as e:
                logger.warning(f"Gemini Quick Fix Error: {e}")

        # Fallbacks in case selected provider failed or isn't available
        if not llm_response and self.gemini_client:
            try:
                model = settings.LLM_MODEL_FAST
                if not model or not model.startswith("gemini-"):
                    model = "gemini-1.5-flash"
                resp = self.gemini_client.models.generate_content(
                    model=model, 
                    contents=prompt, 
                    config=types.GenerateContentConfig(system_instruction=sys_prompt, temperature=0.1)
                )
                if hasattr(resp, 'usage_metadata') and resp.usage_metadata:
                    u = resp.usage_metadata
                    logger.info(f"[TOKEN USAGE - GEMINI QUICK FIX FALLBACK ({strategy})] Prompt: {u.prompt_token_count}, Candidates: {u.candidates_token_count}, Total: {u.total_token_count}")
                llm_response = resp.text
            except Exception as e:
                logger.warning(f"Gemini Quick Fix Fallback Error: {e}")
        if not llm_response and self.groq_client:
            try:
                resp = await asyncio.to_thread(
                    self.groq_client.chat.completions.create,
                    model=getattr(settings, "GROQ_MODEL_FAST", "llama-3.1-8b-instant"),
                    messages=[{"role": "system", "content": sys_prompt}, {"role": "user", "content": prompt}],
                    temperature=0.1
                )
                if hasattr(resp, 'usage') and resp.usage:
                    logger.info(f"[TOKEN USAGE - GROQ QUICK FIX FALLBACK ({strategy})] Prompt: {resp.usage.prompt_tokens}, Completion: {resp.usage.completion_tokens}, Total: {resp.usage.total_tokens}")
                llm_response = resp.choices[0].message.content
            except Exception as e:
                logger.warning(f"Groq Quick Fix Fallback Error: {e}")
        if not llm_response and self.anthropic_client:
            try:
                resp = await self.anthropic_client.messages.create(
                    model=getattr(settings, "LLM_MODEL_FAST", "claude-3-5-sonnet-20241022"),
                    system=sys_prompt,
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=4096,
                    temperature=0.1
                )
                llm_response = self._extract_claude_text(resp.content)
            except Exception as e:
                logger.warning(f"Claude Quick Fix Fallback Error: {e}")

        if not llm_response:
            return contract_text

        # 3. Apply the fix
        llm_response = llm_response.strip()
        
        if strategy == "PARTIAL":
            # Replace exactly the targeted text with the LLM response
            return contract_text.replace(clean_loc, llm_response)
        elif strategy == "ADD":
            # Smart insert before signatures
            return self._insert_new_clause(contract_text, llm_response)
        else:
            # Full replacement
            return llm_response

    # ── History Token Cleanup ──
    def _clean_history_content(self, text: str) -> str:
        """Removes hidden JSON blocks from history to save LLM tokens."""
        if not text: return ""
        tags = ["[REFS]", "[SEGMENT]", "[ESCALATION]", "[SUGGESTIONS]", "<!--REFS-->", "<!--SEGMENT-->", "<!--ESCALATION-->", "<!--SUGGESTIONS-->"]
        for tag in tags:
            if tag in text:
                text = text.split(tag)[0]
        return text.strip()

    # ── Anthropic Claude Implementations ──
    def _extract_claude_text(self, content):
        """Extracts text from Claude's response content, ignoring ThinkingBlocks."""
        if not content: return ""
        texts = []
        for block in content:
            if getattr(block, 'type', '') == 'text':
                texts.append(block.text)
        if not texts and hasattr(content[0], 'text'):
            texts.append(content[0].text)
        return "\n\n".join(texts).strip()

    def _build_claude_messages(self, message, history, max_history=6):
        messages = []
        if history:
            for h in history[-max_history:]:
                role = "user" if h["role"] == "user" else "assistant"
                clean_text = h["content"] if role == "user" else self._clean_history_content(h["content"])
                if clean_text:
                    messages.append({"role": role, "content": clean_text})
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
            temperature=getattr(settings, "LLM_TEMPERATURE", 0.1)
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - CLAUDE CHAT] Input: {resp.usage.input_tokens}, Output: {resp.usage.output_tokens}")
        return self._parse_chat_response(self._extract_claude_text(resp.content))

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
            temperature=getattr(settings, "LLM_TEMPERATURE", 0.1)
        ) as stream:
            async for text in stream.text_stream:
                yield text
            
            final_msg = await stream.get_final_message()
            if hasattr(final_msg, 'usage') and final_msg.usage:
                logger.info(f"[TOKEN USAGE - CLAUDE STREAM] Input: {final_msg.usage.input_tokens}, Output: {final_msg.usage.output_tokens}")

    async def _audit_claude(self, text):
        resp = await self.anthropic_client.messages.create(
            model=getattr(settings, "LLM_MODEL_AUDIT", "claude-3-5-haiku-20241022"),
            system=AUDIT_SYSTEM,
            messages=[{"role": "user", "content": f"Обязательно верни только JSON.\n\nДоговор:\n{text}"}],
            max_tokens=4096,
            temperature=0.2
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - CLAUDE AUDIT] Input: {resp.usage.input_tokens}, Output: {resp.usage.output_tokens}")
        return self._normalize_audit_result(self._parse_json_response(self._extract_claude_text(resp.content), self._mock_audit()))

    async def _counterparty_claude(self, bin_num):
        resp = await self.anthropic_client.messages.create(
            model=getattr(settings, "LLM_MODEL_FAST", "claude-3-5-sonnet-20241022"),
            system=COUNTERPARTY_SYSTEM,
            messages=[{"role": "user", "content": f"Обязательно верни только JSON по БИН {bin_num}"}],
            max_tokens=1024,
            temperature=0.5
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - CLAUDE C-PARTY] Input: {resp.usage.input_tokens}, Output: {resp.usage.output_tokens}")
        return self._parse_json_response(self._extract_claude_text(resp.content), self._mock_counterparty(bin_num))

    async def _gen_doc_claude(self, dtype, desc):
        resp = await self.anthropic_client.messages.create(
            model=getattr(settings, "LLM_MODEL_SMART", "claude-3-5-sonnet-20241022"),
            system=DOCUMENT_GEN_SYSTEM,
            messages=[{"role": "user", "content": f"{dtype}: {desc}"}],
            max_tokens=4096,
            temperature=0.4
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - CLAUDE DOCGEN] Input: {resp.usage.input_tokens}, Output: {resp.usage.output_tokens}")
        return self._extract_claude_text(resp.content)

    # ── Groq Implementations ──
    def _build_messages(self, message, history, max_history=6, user_role="citizen"):
        sys_prompt = LAWYER_CHAT_SYSTEM if user_role == "lawyer" else LEGAL_CHAT_SYSTEM
        messages = [{"role": "system", "content": sys_prompt}]
        if history:
            last_role = None
            for h in history[-max_history:]:
                role = "user" if h["role"] == "user" else "assistant"
                clean_text = h["content"] if role == "user" else self._clean_history_content(h["content"])
                if clean_text:
                    if role == last_role:
                        if messages and messages[-1]["role"] == role:
                            messages[-1]["content"] += "\n" + clean_text
                    else:
                        messages.append({"role": role, "content": clean_text})
                        last_role = role
        reminder = "\n\n(СИСТЕМНОЕ НАПОМИНАНИЕ: Если ты предлагаешь сгенерировать документ, ты ОБЯЗАН дать ссылку в формате: [📝 Сгенерировать документ](/dashboard/documents?generate=ТИП&desc=ОПИСАНИЕ), где ОПИСАНИЕ — подробная суть со всеми именами и суммами, пробелы заменить на +. Без &desc= ссылка сломается!)"
        
        if messages and messages[-1]["role"] == "user":
            messages[-1]["content"] += "\n" + message + reminder
        else:
            messages.append({"role": "user", "content": message + reminder})
        return messages

    async def _chat_groq(self, message, history, user_role="citizen"):
        msgs = self._build_messages(message, history, user_role=user_role)
        model = getattr(settings, "GROQ_MODEL_FAST", "llama-3.1-8b-instant")
        temp = getattr(settings, "LLM_TEMPERATURE", 0.1)
        if "llama" in model.lower():
            temp = max(0.5, temp)
        if hasattr(self, 'async_groq_client') and self.async_groq_client:
            try:
                resp = await self.async_groq_client.chat.completions.create(
                    model=model, messages=msgs, temperature=temp, frequency_penalty=0.5
                )
                if hasattr(resp, 'usage') and resp.usage:
                    logger.info(f"[TOKEN USAGE - GROQ CHAT] Prompt: {resp.usage.prompt_tokens}, Completion: {resp.usage.completion_tokens}, Total: {resp.usage.total_tokens}")
                return self._parse_chat_response(resp.choices[0].message.content)
            except Exception as err:
                logger.warning(f"Async Groq chat failed: {err}. Falling back to sync.")

        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model=model, messages=msgs, temperature=temp, frequency_penalty=0.5
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - GROQ CHAT] Prompt: {resp.usage.prompt_tokens}, Completion: {resp.usage.completion_tokens}, Total: {resp.usage.total_tokens}")
        return self._parse_chat_response(resp.choices[0].message.content)

    async def _chat_groq_stream(self, message, history, user_role="citizen") -> AsyncGenerator[str, None]:
        msgs = self._build_messages(message, history, user_role=user_role)
        model = getattr(settings, "GROQ_MODEL_FAST", "llama-3.1-8b-instant")
        temp = getattr(settings, "LLM_TEMPERATURE", 0.1)
        if "llama" in model.lower():
            temp = max(0.5, temp)
        
        if hasattr(self, 'async_groq_client') and self.async_groq_client:
            try:
                stream = await self.async_groq_client.chat.completions.create(
                    model=model, messages=msgs, temperature=temp, frequency_penalty=0.5, stream=True
                )
                async for chunk in stream:
                    if hasattr(chunk, 'x_groq') and chunk.x_groq and hasattr(chunk.x_groq, 'usage'):
                        usage = chunk.x_groq.usage
                        if usage:
                            logger.info(f"[TOKEN USAGE - GROQ STREAM] Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}")
                    c = chunk.choices[0].delta.content if chunk.choices else None
                    if c:
                        yield c
                return
            except Exception as stream_err:
                logger.warning(f"Async Groq stream failed: {stream_err}. Falling back to sync.")

        stream = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model=model, messages=msgs, temperature=temp, frequency_penalty=0.5, stream=True
        )
        while True:
            try:
                chunk = await asyncio.to_thread(next, stream)
                if hasattr(chunk, 'x_groq') and chunk.x_groq and hasattr(chunk.x_groq, 'usage'):
                    usage = chunk.x_groq.usage
                    if usage:
                        logger.info(f"[TOKEN USAGE - GROQ STREAM] Prompt: {usage.prompt_tokens}, Completion: {usage.completion_tokens}, Total: {usage.total_tokens}")
                c = chunk.choices[0].delta.content if chunk.choices else None
                if c:
                    yield c
            except StopIteration:
                break
            except Exception as e:
                logger.error(f"Sync stream iteration error: {e}")
                break

    async def _audit_groq(self, text):
        model = getattr(settings, "GROQ_MODEL_AUDIT", "llama-3.3-70b-versatile")
        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model=model,
            messages=[{"role": "system", "content": AUDIT_SYSTEM}, {"role": "user", "content": text}],
            response_format={"type": "json_object"}, temperature=0.2
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - GROQ AUDIT] Prompt: {resp.usage.prompt_tokens}, Completion: {resp.usage.completion_tokens}, Total: {resp.usage.total_tokens}")
        return self._normalize_audit_result(json.loads(resp.choices[0].message.content))

    async def _counterparty_groq(self, bin_num):
        model = getattr(settings, "GROQ_MODEL_FAST", "llama-3.1-8b-instant")
        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model=model,
            messages=[{"role": "system", "content": COUNTERPARTY_SYSTEM}, {"role": "user", "content": bin_num}],
            response_format={"type": "json_object"}, temperature=0.5
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - GROQ C-PARTY] Prompt: {resp.usage.prompt_tokens}, Completion: {resp.usage.completion_tokens}, Total: {resp.usage.total_tokens}")
        return json.loads(resp.choices[0].message.content)

    async def _gen_doc_groq(self, dtype, desc):
        model = getattr(settings, "GROQ_MODEL_SMART", "llama-3.3-70b-versatile")
        resp = await asyncio.to_thread(
            self.groq_client.chat.completions.create,
            model=model,
            messages=[{"role": "system", "content": DOCUMENT_GEN_SYSTEM}, {"role": "user", "content": f"{dtype}: {desc}"}],
            temperature=0.4
        )
        if hasattr(resp, 'usage') and resp.usage:
            logger.info(f"[TOKEN USAGE - GROQ DOCGEN] Prompt: {resp.usage.prompt_tokens}, Completion: {resp.usage.completion_tokens}, Total: {resp.usage.total_tokens}")
        return resp.choices[0].message.content

    # ── Gemini Implementations ──
    def _build_gemini_contents(self, message, history, max_history=6):
        contents = []
        if history:
            last_role = None
            for m in history[-max_history:]:
                role = "user" if m["role"] == "user" else "model"
                clean_text = m["content"] if role == "user" else self._clean_history_content(m["content"])
                if clean_text:
                    if role == last_role:
                        if contents and contents[-1].role == role:
                            prev_parts = contents[-1].parts or []
                            prev_text = "".join([p.text or "" for p in prev_parts])
                            contents[-1].parts = [types.Part.from_text(text=prev_text + "\n" + clean_text)]
                    else:
                        contents.append(types.Content(role=role, parts=[types.Part.from_text(text=clean_text)]))
                        last_role = role
        if contents and contents[-1].role == "user":
            prev_parts = contents[-1].parts or []
            prev_text = "".join([p.text or "" for p in prev_parts])
            contents[-1].parts = [types.Part.from_text(text=prev_text + "\n" + message)]
        else:
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
            temperature=getattr(settings, "LLM_TEMPERATURE", 0.1), 
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )
        resp = await self.gemini_client.aio.models.generate_content(model=model, contents=contents, config=config)
        if hasattr(resp, 'usage_metadata') and resp.usage_metadata:
            u = resp.usage_metadata
            logger.info(f"[TOKEN USAGE - GEMINI CHAT] Prompt: {u.prompt_token_count}, Candidates: {u.candidates_token_count}, Total: {u.total_token_count}")
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
            temperature=getattr(settings, "LLM_TEMPERATURE", 0.1),
            max_output_tokens=2048,
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )
        resp = await self.gemini_client.aio.models.generate_content_stream(model=model, contents=contents, config=config)
        async for chunk in resp:
            if chunk.text:
                yield chunk.text
            if hasattr(chunk, 'usage_metadata') and chunk.usage_metadata:
                u = chunk.usage_metadata
                logger.info(f"[TOKEN USAGE - GEMINI STREAM] Prompt: {u.prompt_token_count}, Candidates: {u.candidates_token_count}, Total: {u.total_token_count}")

    async def _audit_gemini(self, text):
        model = settings.LLM_MODEL_AUDIT
        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-flash"
        resp = await self.gemini_client.aio.models.generate_content(model=model, contents=text, config=types.GenerateContentConfig(system_instruction=AUDIT_SYSTEM, temperature=0.3, response_mime_type="application/json"))
        if hasattr(resp, 'usage_metadata') and resp.usage_metadata:
            u = resp.usage_metadata
            logger.info(f"[TOKEN USAGE - GEMINI AUDIT] Prompt: {u.prompt_token_count}, Candidates: {u.candidates_token_count}, Total: {u.total_token_count}")
        return self._normalize_audit_result(self._parse_json_response(resp.text or "", self._mock_audit()))

    async def _counterparty_gemini(self, bin_num):
        model = settings.LLM_MODEL_FAST
        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-flash"
        config = types.GenerateContentConfig(
            system_instruction=COUNTERPARTY_SYSTEM, 
            temperature=0.0, 
            tools=[types.Tool(google_search=types.GoogleSearch())]
        )
        resp = await self.gemini_client.aio.models.generate_content(model=model, contents=f"Найди данные компании по БИН {bin_num} в Казахстане. Обязательно верни JSON.", config=config)
        if hasattr(resp, 'usage_metadata') and resp.usage_metadata:
            u = resp.usage_metadata
            logger.info(f"[TOKEN USAGE - GEMINI C-PARTY] Prompt: {u.prompt_token_count}, Candidates: {u.candidates_token_count}, Total: {u.total_token_count}")
        return self._parse_json_response(resp.text or "", self._mock_counterparty(bin_num))

    async def _gen_doc_gemini(self, dtype, desc):
        model = settings.LLM_MODEL_SMART
        if not model or not model.startswith("gemini-"):
            model = "gemini-1.5-pro"
        resp = await self.gemini_client.aio.models.generate_content(model=model, contents=f"{dtype}: {desc}", config=types.GenerateContentConfig(system_instruction=DOCUMENT_GEN_SYSTEM, temperature=0.4))
        if hasattr(resp, 'usage_metadata') and resp.usage_metadata:
            u = resp.usage_metadata
            logger.info(f"[TOKEN USAGE - GEMINI DOCGEN] Prompt: {u.prompt_token_count}, Candidates: {u.candidates_token_count}, Total: {u.total_token_count}")
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
            return {"content": "", "segment": "b2c", "references": [], "escalation": None, "suggestions": []}
        # КРИТИЧЕСКИЙ ФИЛЬТР: Удаляем иероглифы, вьетнамские символы и прочий мусор.
        # Оставляем: Кирилллицу, Латиницу (для ссылок), Цифры и Пунктуацию.
        import re
        import urllib.parse
        content = str(raw)
        
        all_tags = [
            "[REFS]", "[SEGMENT]", "[ESCALATION]", "[SUGGESTIONS]",
            "<!--REFS-->", "<!--SEGMENT-->", "<!--ESCALATION-->", "<!--SUGGESTIONS-->"
        ]
        
        # Extract suggestions
        suggestions = []
        sug_tag = None
        if "[SUGGESTIONS]" in content:
            sug_tag = "[SUGGESTIONS]"
        elif "<!--SUGGESTIONS-->" in content:
            sug_tag = "<!--SUGGESTIONS-->"
            
        if sug_tag:
            parts = content.split(sug_tag)
            try:
                sug_str = parts[1].strip()
                if "-->" in sug_str and sug_tag == "<!--SUGGESTIONS-->":
                    sug_str = sug_str.split("-->")[0].strip()
                for t in all_tags:
                    if t in sug_str:
                        sug_str = sug_str.split(t)[0].strip()
                
                # Robust suggestions parsing
                json_match = re.search(r'(\[.*\])', sug_str, re.DOTALL)
                if json_match:
                    sug_str = json_match.group(1).strip()
                
                try:
                    suggestions = json.loads(sug_str)
                except Exception:
                    try:
                        suggestions = json.loads(sug_str.replace("'", '"'))
                    except Exception:
                        strings = re.findall(r'["\'](.*?)["\']', sug_str)
                        if strings:
                            suggestions = [s.strip() for s in strings if s.strip()]
                        else:
                            suggestions = [line.strip().lstrip("-*•→ ").strip() for line in sug_str.split("\n") if line.strip()]
                            suggestions = [s for s in suggestions if s not in ["[", "]", "{", "}"] and not s.startswith('"') and not s.startswith("'")]
                
                if not isinstance(suggestions, list):
                    suggestions = []
                suggestions = [str(s).strip() for s in suggestions[:3]]
            except Exception as e:
                logger.warning(f"Failed to parse suggestions: {e}")
        
        # Process escalation (both format)
        escalation = None
        esc_tag = None
        if "[ESCALATION]" in content:
            esc_tag = "[ESCALATION]"
        elif "<!--ESCALATION-->" in content:
            esc_tag = "<!--ESCALATION-->"
            
        if esc_tag:
            parts = content.split(esc_tag)
            try:
                esc_str = parts[1].strip()
                if "-->" in esc_str and esc_tag == "<!--ESCALATION-->":
                    esc_str = esc_str.split("-->")[0].strip()
                for t in all_tags:
                    if t in esc_str:
                        esc_str = esc_str.split(t)[0].strip()
                
                # Robust escalation parsing
                json_match = re.search(r'(\{.*\})', esc_str, re.DOTALL)
                if json_match:
                    esc_str = json_match.group(1).strip()
                
                try:
                    escalation = json.loads(esc_str)
                except Exception:
                    try:
                        escalation = json.loads(esc_str.replace("'", '"'))
                    except Exception:
                        needed_match = re.search(r'"needed"\s*:\s*(true|false)', esc_str, re.IGNORECASE)
                        reason_match = re.search(r'"reason"\s*:\s*["\'](.*?)["\']', esc_str)
                        cat_match = re.search(r'"category"\s*:\s*["\'](.*?)["\']', esc_str)
                        if needed_match:
                            escalation = {
                                "needed": needed_match.group(1).lower() == "true",
                                "reason": reason_match.group(1) if reason_match else "",
                                "category": cat_match.group(1) if cat_match else ""
                            }
            except Exception as e:
                logger.warning(f"Failed to parse escalation: {e}")

        # Process segment (both format)
        segment = "b2c"
        seg_tag = None
        if "[SEGMENT]" in content:
            seg_tag = "[SEGMENT]"
        elif "<!--SEGMENT-->" in content:
            seg_tag = "<!--SEGMENT-->"
 
        if seg_tag:
            parts = content.split(seg_tag)
            try:
                segment_part = parts[1].strip()
                if "-->" in segment_part and seg_tag == "<!--SEGMENT-->":
                    segment_part = segment_part.split("-->")[0].strip()
                for t in all_tags:
                    if t in segment_part:
                        segment_part = segment_part.split(t)[0].strip()
                segment = "b2b" if "b2b" in segment_part.lower() else "b2c"
            except Exception as e:
                logger.warning(f"Failed to parse segment: {e}")

        # Process references (both format)
        refs = []
        refs_tag = None
        if "[REFS]" in content:
            refs_tag = "[REFS]"
        elif "<!--REFS-->" in content:
            refs_tag = "<!--REFS-->"
 
        if refs_tag:
            parts = content.split(refs_tag)
            try:
                raw_refs_str = parts[1].strip()
                if "-->" in raw_refs_str and refs_tag == "<!--REFS-->":
                    raw_refs_str = raw_refs_str.split("-->")[0].strip()
                
                # Split other trailing tags if they got included
                for tag in all_tags:
                    if tag in raw_refs_str:
                        raw_refs_str = raw_refs_str.split(tag)[0].strip()
                
                json_match = re.search(r'(\[.*\])', raw_refs_str, re.DOTALL)
                if json_match:
                    raw_refs_str = json_match.group(1).strip()
                
                try:
                    raw_refs = json.loads(raw_refs_str)
                except Exception:
                    try:
                        raw_refs = json.loads(raw_refs_str.replace("'", '"'))
                    except Exception:
                        raw_refs = []
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
                        
                        snippet = ref.get("snippet", "").strip()
                        
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
                            "articles": articles,
                            "snippet": snippet
                        })
            except Exception as e:
                logger.warning(f"Failed to parse refs: {e}")
            
        # Clean content of all tags cleanly
        for tag in all_tags:
            if tag in content:
                content = content.split(tag)[0]

        # Clean any leaked bulleted suggestions from the main content
        content_lower = content.lower()
        for header in ["подсказки:", "подсказки", "готовые ответы:", "готовые ответы", "варианты дальнейших действий:", "варианты дальнейших действий", "варианты ответов:", "варианты ответов"]:
            if header in content_lower:
                idx = content_lower.find(header)
                if idx > len(content) * 0.5 or idx < 40:
                    content = content[:idx].strip()
                    break

        content_final = content.strip()
        if not content_final:
            content_final = "Пожалуйста, опишите вашу проблему подробнее, чтобы я мог дать точную юридическую рекомендацию."

        return {
            "content": content_final,
            "segment": segment,
            "references": refs,
            "escalation": escalation,
            "suggestions": suggestions
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

    def transcribe_audio(self, file_path: str) -> str:
        """Transcribes audio file using Groq Whisper API (whisper-large-v3)."""
        if not hasattr(self, 'groq_client') or not self.groq_client:
            raise Exception("Интеграция Groq не настроена на сервере.")
        
        # Whisper model is optimized for bilingual and mixed speech transcription.
        # We use a two-pass logic:
        # 1. First run with auto-detection (so Russian is not translated).
        # 2. If the output is transcribed in Latin (e.g. Whisper misdetects short Kazakh as Romanian or Latin),
        #    we re-run forcing language='kk' to guarantee Cyrillic script output.
        try:
            with open(file_path, "rb") as file:
                transcription = self.groq_client.audio.transcriptions.create(
                    file=file,
                    model="whisper-large-v3",
                    response_format="json",
                    prompt="Сәлеметсіз бе! Маған заңгерлік көмек керек. Еңбек кодексінің 52-бабында не жазылған? Договорды қалай тексеруге болады? Статья және заңдар.",
                )
                text = transcription.get("text", "") if isinstance(transcription, dict) else getattr(transcription, 'text', '')
                
            # Count Latin vs Cyrillic characters to check script
            latin_chars = len(re.findall(r'[a-zA-Zăâîşţșțßöäü]', text))
            cyrillic_chars = len(re.findall(r'[а-яА-ЯёЁәғқңөұүһіӘҒҚҢӨҰҮҺІ]', text))
            
            # If transcription is mostly Latin, re-run with forced Kazakh to get Cyrillic
            if latin_chars > 0 and (cyrillic_chars == 0 or (latin_chars / (latin_chars + cyrillic_chars)) > 0.2):
                logger.info(f"Whisper auto-detect produced Latin/Romanian script: '{text}'. Re-running with forced language='kk' for Cyrillic.")
                with open(file_path, "rb") as file:
                    transcription = self.groq_client.audio.transcriptions.create(
                        file=file,
                        model="whisper-large-v3",
                        response_format="json",
                        language="kk",
                        prompt="Сәлеметсіз бе! Маған заңгерлік көмек керек. Еңбек кодексінің 52-бабында не жазылған? Договорды қалай тексеруге болады? Статья және заңдар.",
                    )
                    text = transcription.get("text", "") if isinstance(transcription, dict) else getattr(transcription, 'text', '')
            
            return text
        except Exception as e:
            logger.error(f"Whisper transcription failed: {e}")
            raise Exception(f"Ошибка распознавания речи: {str(e)}")

    def _mock_chat(self, msg):
        return {"content": "Демо-режим. Подключите API.", "segment": "b2c", "references": []}

    def _mock_audit(self):
        return {"risks": [{"level": "low", "title": "Демо", "description": "Недоступно.", "recommendation": "Подключите ключ.", "article": "Ст. 1", "url": "#"}], "summary": "Демо", "totalRisks": 1}

    def _mock_counterparty(self, b):
        return self._normalize_counterparty_result({}, b)


gemini_service = LLMService()
