import pytest
import asyncio
from unittest.mock import AsyncMock, MagicMock
from services.agent_orchestrator import LegalAgentOrchestrator

@pytest.fixture
def mock_llm():
    llm = MagicMock()
    llm.chat = AsyncMock(side_effect=lambda prompt, history, user_role, *args, **kwargs: {
        "content": "Юридический ответ",
        "segment": "b2c",
        "references": []
    } if "Проверь ответ" not in prompt else {"content": "Проверенный ответ"})
    
    # Mocking query generation
    def side_effect_gen(prompt, history, user_role, *args, **kwargs):
        if "Преврати вопрос" in prompt:
            return {"content": "запрос1, запрос2"}
        return {"content": "ответ"}
        
    llm.chat.side_effect = side_effect_gen
    return llm

@pytest.fixture
def mock_rag():
    rag = MagicMock()
    rag.search = MagicMock(return_value=["Статья 1", "Статья 2"])
    rag.get_context_string = MagicMock(return_value="Контекст")
    return rag

@pytest.fixture
def mock_scorer():
    scorer = MagicMock()
    scorer.calculate_risk = MagicMock(return_value={
        "level": "low", "score": 10, "found_triggers": []
    })
    return scorer

@pytest.mark.asyncio
async def test_orchestrator_chat_flow(mock_llm, mock_rag, mock_scorer):
    orchestrator = LegalAgentOrchestrator(mock_llm, mock_rag, mock_scorer)
    
    # Mock chat to return specific content for different prompts
    async def custom_chat(prompt, history, user_role, *args, **kwargs):
        if "Преврати вопрос" in prompt:
            return {"content": "запрос1, запрос2"}
        if "Проверь ответ" in prompt:
            return {"content": "Проверенный ответ"}
        return {"content": "Первичный ответ"}

    mock_llm.chat.side_effect = custom_chat
    
    response = await orchestrator.process_chat_query(
        "Как правильно уволиться с работы по собственному желанию в соответствии с Трудовым кодексом Республики Казахстан, чтобы работодатель выплатил все причитающиеся компенсации?",
        [{"role": "user", "content": "Привет"}],
        "lawyer"
    )
    
    assert "thought" in response
    assert "Использую базу знаний" in response["thought"]
    # Check if verification was called (for lawyer role)
    assert response["content"] == "Проверенный ответ"
    assert mock_rag.search.call_count >= 2

@pytest.mark.asyncio
async def test_orchestrator_audit_flow(mock_llm, mock_rag, mock_scorer):
    orchestrator = LegalAgentOrchestrator(mock_llm, mock_rag, mock_scorer)
    
    mock_llm.audit_contract = AsyncMock(return_value={"risks": []})
    
    result = await orchestrator.process_contract_audit("Текст договора")
    
    assert "risks" in result
    assert mock_scorer.calculate_risk.called
    assert mock_rag.get_context_string.called
