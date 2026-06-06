import sys
import os
import asyncio

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.agent_orchestrator import LegalAgentOrchestrator
from services.gemini_service import LLMService
from services.rag_service import LegalRAGService
from services.legal_scoring import LegalRiskScorer

async def main():
    llm = LLMService()
    rag = LegalRAGService()
    risk = LegalRiskScorer()
    agent = LegalAgentOrchestrator(llm_service=llm, rag_service=rag, risk_scorer=risk)
    
    print("TEST 1: Fake or irrelevant query (Should trigger Hard Refusal)")
    query1 = "Каковы правила разведения аквариумных рыбок на рабочем месте по законам РК?"
    response1 = await agent.process_chat_query(query1, history=[], user_role="citizen")
    print(f"\nResponse 1:\n{response1['content']}\n")
    print(f"Firewall Triggered: {response1.get('debug_info', {}).get('firewall_triggered')}")
    print("-" * 50)
    
    print("TEST 2: Real query about Civil Code (Should be answered with citations)")
    query2 = "Что такое исковая давность и какой общий срок исковой давности по Гражданскому кодексу РК?"
    response2 = await agent.process_chat_query(query2, history=[], user_role="citizen")
    print(f"\nResponse 2:\n{response2['content']}\n")
    print(f"Firewall Triggered: {response2.get('debug_info', {}).get('firewall_triggered')}")
    print("-" * 50)

if __name__ == "__main__":
    asyncio.run(main())
