import os
from fpdf import FPDF
import json
from datetime import datetime

class AuditPDFReport(FPDF):
    def header(self):
        # Arial bold 15
        self.set_font('Roboto', 'B', 15)
        # Title
        self.cell(0, 10, 'AI-Legal-KZ: Отчет об аудите документа', border=False, new_x='LMARGIN', new_y='NEXT', align='C')
        self.ln(5)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('Roboto', '', 8)
        # Page number
        self.cell(0, 10, f'Страница {self.page_no()}', 0, 0, 'C')

import textwrap
import re

def safe_text(text):
    if not text:
        return ""
    text = str(text)
    # Break any long continuous words
    text = re.sub(r'(\S{40})', r'\1 ', text)
    # Wrap text to max 80 chars per line to guarantee it fits FPDF horizontal space
    wrapped = []
    for line in text.split('\n'):
        wrapped.append(textwrap.fill(line, width=80, break_long_words=True, break_on_hyphens=False))
    return '\n'.join(wrapped)

def generate_audit_pdf(audit_record) -> str:
    """Generate a PDF report for the given audit record and return the file path."""
    pdf = AuditPDFReport()
    
    # Add fonts
    font_path = os.path.join(os.path.dirname(__file__), '..', 'fonts', 'Roboto-Regular.ttf')
    font_bold_path = os.path.join(os.path.dirname(__file__), '..', 'fonts', 'Roboto-Bold.ttf')
    
    pdf.add_font('Roboto', '', font_path, uni=True)
    pdf.add_font('Roboto', 'B', font_bold_path, uni=True)
    
    pdf.add_page()
    
    pdf.set_font('Roboto', 'B', 12)
    pdf.multi_cell(0, 10, f'Название документа: {safe_text(audit_record.filename)}', new_x='LMARGIN', new_y='NEXT')
    
    doc_type_str = getattr(audit_record, "doc_type", None) or "Не определен"
    pdf.set_font('Roboto', '', 11)
    pdf.multi_cell(0, 8, f'Тип документа: {safe_text(doc_type_str)}', new_x='LMARGIN', new_y='NEXT')
    
    pdf.cell(0, 8, f'Дата аудита: {audit_record.created_at.strftime("%Y-%m-%d %H:%M:%S")}', new_x='LMARGIN', new_y='NEXT')
    
    pdf.ln(5)
    pdf.set_font('Roboto', 'B', 14)
    pdf.cell(0, 10, 'Резюме аудита', new_x='LMARGIN', new_y='NEXT')
    
    pdf.set_font('Roboto', '', 11)
    pdf.multi_cell(0, 8, safe_text(audit_record.summary) or "Нет описания.", new_x='LMARGIN', new_y='NEXT')
    
    pdf.ln(5)
    pdf.set_font('Roboto', 'B', 14)
    pdf.cell(0, 10, f'Выявленные риски ({audit_record.total_risks})', new_x='LMARGIN', new_y='NEXT')
    
    try:
        risks = json.loads(audit_record.risks_json)
    except Exception:
        risks = []
        
    for i, risk in enumerate(risks, 1):
        pdf.ln(3)
        pdf.set_font('Roboto', 'B', 12)
        level_str = risk.get('level', 'N/A').upper()
        if level_str == 'HIGH':
            level_str = 'ВЫСОКИЙ РИСК'
        elif level_str == 'MEDIUM':
            level_str = 'СРЕДНИЙ РИСК'
        elif level_str == 'LOW':
            level_str = 'РЕКОМЕНДАЦИЯ'
            
        pdf.multi_cell(0, 8, f'{i}. {safe_text(risk.get("title", "Риск"))} [{level_str}]', new_x='LMARGIN', new_y='NEXT')
        
        pdf.set_font('Roboto', '', 11)
        pdf.multi_cell(0, 7, f'Описание: {safe_text(risk.get("description", ""))}', new_x='LMARGIN', new_y='NEXT')
        pdf.multi_cell(0, 7, f'Рекомендация: {safe_text(risk.get("recommendation", ""))}', new_x='LMARGIN', new_y='NEXT')
        
        if risk.get("location"):
            pdf.set_font('Roboto', '', 10)
            pdf.multi_cell(0, 7, f'Цитата из текста: {safe_text(risk.get("location", ""))}', new_x='LMARGIN', new_y='NEXT')
            
        if risk.get("article"):
            pdf.set_font('Roboto', 'B', 10)
            pdf.multi_cell(0, 7, f'Законодательство: {safe_text(risk.get("article", ""))}', new_x='LMARGIN', new_y='NEXT')
            
        if risk.get("url"):
            pdf.set_font('Roboto', '', 9)
            pdf.multi_cell(0, 6, f'Ссылка: {safe_text(risk.get("url", ""))}', new_x='LMARGIN', new_y='NEXT')
    
    # Save the PDF to a temporary file
    temp_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f'audit_report_{audit_record.id}.pdf')
    pdf.output(file_path)
    return file_path
