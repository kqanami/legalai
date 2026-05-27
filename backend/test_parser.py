import os
import sys
from services.document_parser import extract_text

files = os.listdir("uploads")
for f in files:
    if f.endswith(".docx") or f.endswith(".pdf"):
        path = os.path.join("uploads", f)
        print(f"\n--- Parsing: {path} ---")
        text = extract_text(path)
        print("Text length:", len(text))
        if len(text) > 0:
            print("Preview:", repr(text[:100]))
        else:
            print("FAILED TO EXTRACT TEXT")
