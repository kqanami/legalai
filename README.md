# AI Legal Assistant KZ ⚖️🇰🇿

Инновационная платформа юридической помощи на базе ИИ, адаптированная под законодательство Республики Казахстан. Платформа использует RAG (Retrieval-Augmented Generation) с многоязычными эмбеддингами Gemini для обеспечения максимальной точности и отсутствия галлюцинаций.

---

## 🏗 Архитектура
- **Frontend**: React + Vite + Tailwind CSS + Framer Motion (Premium UI/UX)
- **Backend**: FastAPI (Python) + SQLAlchemy + ChromaDB (Vector Store)
- **AI Engine**: Groq (Llama 3.3 70B) & Google Gemini 2.0 Flash
- **Search**: Google Search Grounding & Custom RAG Pipeline

---

## 🚀 Быстрый запуск

### Запуск через Docker (Рекомендуемый способ)
Самый простой и надежный способ запустить проект — использовать Docker Compose.

1. Убедитесь, что у вас установлены Docker и Docker Compose.
2. Создайте файл `backend/.env` и заполните его:
```env
GEMINI_API_KEY=ваш_ключ
GROQ_API_KEY=ваш_ключ
DATABASE_URL=sqlite:///./legal_assistant.db
JWT_SECRET=ваш_секретный_ключ
DEBUG_MODE=true
```
3. Запустите проект одной командой из корня репозитория:
```bash
docker-compose up -d --build
```
Платформа будет доступна по адресу: `http://localhost:5173` (бэкенд на порту `8000`).

---

### Запуск без Docker (Локальная среда)

#### 1. Подготовка окружения (Backend)
Перейдите в директорию бэкенда и создайте виртуальное окружение:

```bash
cd backend
python -m venv venv
source venv/bin/activate  # На Windows: venv\Scripts\activate
pip install -r requirements.txt
```

#### 2. Запуск бэкенда
```bash
uvicorn main:app --reload --port 8000
```

#### 3. Запуск фронтенда
Откройте новый терминал в директории `ai-legal-kz`:

```bash
npm install
npm run dev
```

Платформа будет доступна по адресу: `http://localhost:5173`

---

## 💎 Ключевые возможности
- **Legal Chat**: Консультации со ссылками на статьи кодексов РК (УК, ГК, ТК и др.).
- **Smart Audit**: Автоматический поиск рисков в договорах по праву Казахстана.
- **Counterparty Check**: Проверка благонадежности компаний по БИН через гос. реестры.
- **Lawyer Workspace**: Личный кабинет для адвокатов с управлением делами и шаблонами.
- **Safe Mode**: Автоматическая фильтрация иероглифов и мусорных токенов.

---

## 🛠 Команды разработки
- `python scripts/mega_ingest.py` — массовый импорт новых кодексов в RAG.
- `python scripts/debug_rag.py` — проверка качества поиска в векторной базе.
- `npm run build` — сборка фронтенда для продакшена.

---
