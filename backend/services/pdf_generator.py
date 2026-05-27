import os
from fpdf import FPDF
import json
from datetime import datetime

class AuditPDFReport(FPDF):
    def header(self):
        # Arial bold 15
        self.set_font('Roboto', 'B', 15)
        # Title
        self.cell(0, 10, 'AI-Legal-KZ: Отчет об аудите документа', border=False, ln=1, align='C')
        self.ln(5)

    def footer(self):
        # Position at 1.5 cm from bottom
        self.set_y(-15)
        self.set_font('Roboto', '', 8)
        # Page number
        self.cell(0, 10, f'Страница {self.page_no()}', 0, 0, 'C')

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
    pdf.cell(0, 10, f'Название документа: {audit_record.filename}', ln=1)
    
    doc_type_str = getattr(audit_record, "doc_type", None) or "Не определен"
    pdf.set_font('Roboto', '', 11)
    pdf.cell(0, 8, f'Тип документа: {doc_type_str}', ln=1)
    
    pdf.cell(0, 8, f'Дата аудита: {audit_record.created_at.strftime("%Y-%m-%d %H:%M:%S")}', ln=1)
    
    pdf.ln(5)
    pdf.set_font('Roboto', 'B', 14)
    pdf.cell(0, 10, 'Резюме аудита', ln=1)
    
    pdf.set_font('Roboto', '', 11)
    pdf.multi_cell(0, 8, audit_record.summary or "Нет описания.")
    
    pdf.ln(5)
    pdf.set_font('Roboto', 'B', 14)
    pdf.cell(0, 10, f'Выявленные риски ({audit_record.total_risks})', ln=1)
    
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
            
        pdf.cell(0, 8, f'{i}. {risk.get("type", "Риск")} [{level_str}]', ln=1)
        
        pdf.set_font('Roboto', '', 11)
        pdf.multi_cell(0, 7, f'Описание: {risk.get("description", "")}')
        pdf.multi_cell(0, 7, f'Рекомендация: {risk.get("recommendation", "")}')
        if risk.get("law_reference"):
            pdf.set_font('Roboto', 'B', 10)
            pdf.multi_cell(0, 7, f'Законодательство: {risk.get("law_reference", "")}')
    
    # Save the PDF to a temporary file
    temp_dir = os.path.join(os.path.dirname(__file__), '..', 'uploads')
    os.makedirs(temp_dir, exist_ok=True)
    file_path = os.path.join(temp_dir, f'audit_report_{audit_record.id}.pdf')
    pdf.output(file_path)
    return file_path
