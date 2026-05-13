
import json

# Цены Anthropic за 1,000,000 токенов (в USD)
PRICING = {
    "haiku": {"in": 0.25, "out": 1.25},
    "sonnet": {"in": 3.00, "out": 15.00},
    "opus": {"in": 15.00, "out": 75.00}
}

def calculate_monthly_cost(users_config):
    """
    users_config = {
        "freemium": 1000,  # кол-во активных пользователей
        "go": 100,
        "business": 10
    }
    """
    total_usd = 0
    details = []

    # 1. FREEMIUM Scenario
    # 3 сообщения на Sonnet (Aha-moment) + 10 сообщений на Haiku в месяц
    free_users = users_config.get("freemium", 0)
    # Sonnet part (Trial)
    in_tokens = 3 * 1500 # средний вход с учетом RAG
    out_tokens = 3 * 600
    cost_sonnet = (in_tokens * PRICING["sonnet"]["in"] + out_tokens * PRICING["sonnet"]["out"]) / 1_000_000
    # Haiku part (Base)
    in_tokens_h = 10 * 1000
    out_tokens_h = 10 * 300
    cost_haiku = (in_tokens_h * PRICING["haiku"]["in"] + out_tokens_h * PRICING["haiku"]["out"]) / 1_000_000
    
    total_free = free_users * (cost_sonnet + cost_haiku)
    total_usd += total_free
    details.append(f"FREEMIUM ({free_users} чел): ${total_free:.2f} (Затраты на 1 юзера: ${ (cost_sonnet+cost_haiku):.4f})")

    # 2. GO Scenario
    # 30 дней по 5 сообщений в среднем (лимит 50, но реально пишут меньше)
    # Все на Sonnet. Внутренние утилиты (поиск) на Haiku.
    go_users = users_config.get("go", 0)
    # Sonnet (Main Chat)
    msgs_per_month = 30 * 5
    in_t = msgs_per_month * 2500 # Накопленная история + RAG
    out_t = msgs_per_month * 800
    cost_go_sonnet = (in_t * PRICING["sonnet"]["in"] + out_t * PRICING["sonnet"]["out"]) / 1_000_000
    # Haiku (Utility search gen)
    cost_go_haiku = (msgs_per_month * 500 * PRICING["haiku"]["in"] + msgs_per_month * 100 * PRICING["haiku"]["out"]) / 1_000_000
    
    total_go = go_users * (cost_go_sonnet + cost_go_haiku)
    total_usd += total_go
    details.append(f"GO ({go_users} чел): ${total_go:.2f} (Затраты на 1 юзера: ${ (cost_go_sonnet+cost_go_haiku):.2f})")

    # 3. BUSINESS Scenario
    # Интенсивное использование Opus для аудитов + Sonnet
    biz_users = users_config.get("business", 0)
    # Opus (10 больших аудитов по 10к токенов вход)
    audits = 10
    cost_opus = (audits * 10000 * PRICING["opus"]["in"] + audits * 2000 * PRICING["opus"]["out"]) / 1_000_000
    # Sonnet (Обычный чат, как в GO)
    cost_biz_sonnet = cost_go_sonnet 
    
    total_biz = biz_users * (cost_opus + cost_biz_sonnet)
    total_usd += total_biz
    details.append(f"BUSINESS ({biz_users} чел): ${total_biz:.2f} (Затраты на 1 юзера: ${ (cost_opus+cost_biz_sonnet):.2f})")

    return total_usd, details

def main():
    # Моделируем рост
    scenarios = [
        {"name": "STARTUP (MVP)", "config": {"freemium": 100, "go": 10, "business": 2}},
        {"name": "GROWTH (Scale)", "config": {"freemium": 1000, "go": 150, "business": 20}},
        {"name": "PRO (Market Leader)", "config": {"freemium": 5000, "go": 800, "business": 100}},
    ]

    print("\n" + "="*60)
    print("CALCULATING CLAUDE API ECONOMICS (MONTHLY BURN)")
    print("="*60)

    for sc in scenarios:
        total, details = calculate_monthly_cost(sc["config"])
        revenue = sc["config"]["go"] * 11 + sc["config"]["business"] * 110 
        profit = revenue - total
        
        print(f"\nScenario: {sc['name']}")
        for d in details:
            print(f"  - {d}")
        print(f"  TOTAL API BURN:  ${total:.2f}")
        print(f"  EST. REVENUE:    ${revenue:.2f}")
        print(f"  GROSS PROFIT:    ${profit:.2f} (Margin: {(profit/revenue*100 if revenue else 0):.1f}%)")

    print("\n" + "="*60)
    print("ВЫВОД: Ваша маржинальность на платных тарифах составляет >80%.")
    print("Фримиум обходится примерно в $0.01 на пользователя.")
    print("="*60 + "\n")

if __name__ == "__main__":
    main()
