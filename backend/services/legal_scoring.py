import re
from typing import Dict, Any

class LegalRiskScorer:
    """
    Проприетарная алгоритмическая модель (Legal Risk Scorer) для оценки рисков в договорах.
    Это часть нашего "технологического рва", которая анализирует текст до того, как он попадет в LLM.
    Она использует эвристики и веса для выявления скрытых асимметрий в контракте.
    """
    def __init__(self):
        # Взвешенный словарь триггеров риска (Паттерны -> Вес риска)
        self.risk_triggers = {
            r"неустойк[ауи]": 15,
            r"штраф": 10,
            r"пени": 10,
            r"расторжени[ея]\s+в\s+одностороннем\s+порядке": 25,
            r"не\s+несет\s+ответственности": 20,
            r"отказ\s+от\s+ответственности": 20,
            r"форс-мажор": 5,
            r"суд\s+по\s+месту\s+нахождения\s+истца": 15, 
            r"коммерческ[аяую]\s+тайн[ау]": 10,
            r"без\s+объяснения\s+причин": 20
        }
        
    def calculate_risk(self, text: str) -> Dict[str, Any]:
        """Вычисляет математический скоринг риска для переданного текста договора."""
        text_lower = text.lower()
        total_score = 0
        found_triggers = []
        
        for pattern, weight in self.risk_triggers.items():
            matches = list(re.finditer(pattern, text_lower))
            match_count = len(matches)
            
            if match_count > 0:
                # Математическая модель убывающей предельной полезности (diminishing returns)
                score_increase = weight + (match_count - 1) * (weight * 0.2) 
                total_score += score_increase
                
                # Очистка паттерна для читаемости
                clean_name = pattern.replace(r"\s+", " ").replace(r"[ауи]", "а/у/и").replace(r"[ея]", "е/я").replace(r"[аяую]", "ая/ую").replace("\\", "")
                
                found_triggers.append({
                    "trigger": clean_name,
                    "count": match_count,
                    "impact": round(score_increase, 2)
                })
                
        # Нормализация скоринга в диапазон 0-100
        normalized_score = min(max(int(total_score), 0), 100)
        
        # Классификация риска
        if normalized_score < 30:
            level = "low"
            description = "Низкий уровень алгоритмического риска."
        elif normalized_score < 70:
            level = "medium"
            description = "Средний уровень алгоритмического риска. Присутствуют штрафные санкции и односторонние права."
        else:
            level = "high"
            description = "Критический уровень риска. Договор содержит жесткие санкции и высокую асимметрию прав."
            
        return {
            "score": normalized_score,
            "level": level,
            "description": description,
            "found_triggers": found_triggers
        }

legal_scorer = LegalRiskScorer()
