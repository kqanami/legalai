import os
import logging
from PyPDF2 import PdfReader
import docx

logger = logging.getLogger(__name__)

def extract_text(file_path: str) -> str:
    """Extract text from a given file (pdf, docx, txt)."""
    if not os.path.exists(file_path):
        return ""
        
    ext = os.path.splitext(file_path)[1].lower()
    text = ""
    
    try:
        if ext == ".pdf":
            reader = PdfReader(file_path)
            for page in reader.pages:
                extracted = page.extract_text()
                if extracted:
                    text += extracted + "\n"
                    
        elif ext in [".docx", ".doc"]:
            # Note: python-docx handles .docx well. For older .doc files, it might fail or require antiword/olefile.
            # Here we try to parse it as docx.
            try:
                doc = docx.Document(file_path)
                full_text = []
                for p in doc.paragraphs:
                    if p.text.strip():
                        full_text.append(p.text.strip())
                for table in doc.tables:
                    for row in table.rows:
                        row_text = [cell.text.strip() for cell in row.cells if cell.text.strip()]
                        if row_text:
                            full_text.append(" | ".join(row_text))
                text = "\n".join(full_text)
            except Exception as e:
                logger.warning(f"Could not parse as docx, trying generic read: {e}")
                # Don't try generic read for docx/doc as it's binary
                text = ""
                    
        elif ext == ".txt":
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                text = f.read()
                
        else:
            logger.warning(f"Unsupported file type for text extraction: {ext}")
            
    except Exception as e:
        logger.error(f"Error extracting text from {file_path}: {e}")
        
    return text.strip()
