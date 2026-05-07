import requests
from bs4 import BeautifulSoup
import sys
import os
import re
import time

# Add backend to path
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.rag_service import rag_service

class AdiletScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
        }

    def scrape_law(self, url, category):
        print(f"Scraping: {url}...")
        try:
            response = requests.get(url, headers=self.headers)
            response.raise_for_status()
            
            # Adilet often has content in a specific div
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # This is a heuristic - Adilet structure varies, but often it's in 'law_content' or similar
            content_div = soup.find('div', class_='document-content') or soup.find('div', id='law_content') or soup.find('body')
            
            if not content_div:
                print("Could not find content div.")
                return

            # Clean up the text
            text = content_div.get_text(separator='\n')
            
            # Use the existing mega_ingest logic but adapted for memory
            self._ingest_text(text, url, category)
            
        except Exception as e:
            print(f"Scraping error: {e}")

    def _ingest_text(self, text, source_url, category):
        # Find articles: "Статья 1.", "1-бап."
        # We'll support both RU and KZ patterns
        pattern = r"(Статья\s+\d+|(\d+)-бап)"
        sections = re.split(pattern, text)
        
        docs = []
        metas = []
        ids = []
        
        # Similar logic to mega_ingest
        for i in range(1, len(sections), 3):
            title = sections[i].strip()
            body = sections[i+2].strip() if (i+2) < len(sections) else ""
            
            full_text = f"{title}\n{body}"[:8000]
            
            art_num_match = re.search(r"(\d+)", title)
            art_num = art_num_match.group(1) if art_num_match else "unknown"
            
            doc_id = f"scraped_{category}_{art_num}_{hash(source_url) % 1000}"
            
            docs.append(full_text)
            metas.append({
                "source": source_url,
                "article": art_num,
                "category": category,
                "type": "scraped"
            })
            ids.append(doc_id)

        print(f"Parsed {len(docs)} articles.")
        
        # Ingest in batches
        batch_size = 30
        for j in range(0, len(docs), batch_size):
            rag_service.add_documents(
                docs[j:j+batch_size], 
                metas[j:j+batch_size], 
                ids[j:j+batch_size]
            )
            print(f"  Ingested batch {j//batch_size + 1}")

if __name__ == "__main__":
    scraper = AdiletScraper()
    # Example: Civil Code (General Part)
    # URL is often in format: https://adilet.zan.kz/rus/docs/K940001000_
    scraper.scrape_law("https://adilet.zan.kz/rus/docs/K940001000_", "civil_code")
