import requests
from bs4 import BeautifulSoup
import sys
import os
import re
import time
import argparse

# Force UTF-8 encoding
os.environ["PYTHONIOENCODING"] = "utf-8"

# Add backend to path so we can import services
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))

from services.rag_service import rag_service

# Comprehensive Catalogue of official RK Legislation URLs on adilet.zan.kz
LEGISLATION_CATALOG = {
    "civil_general": {
        "title": "Гражданский кодекс РК (Общая часть)",
        "url": "https://adilet.zan.kz/rus/docs/K940001000_",
        "category": "civil",
        "file": "civil_general.md"
    },
    "civil_special": {
        "title": "Гражданский кодекс РК (Особенная часть)",
        "url": "https://adilet.zan.kz/rus/docs/K990000409_",
        "category": "civil",
        "file": "civil_special.md"
    },
    "labor": {
        "title": "Трудовой кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1500000414",
        "category": "labor",
        "file": "labor.md"
    },
    "tax": {
        "title": "Налоговый кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1700000120",
        "category": "tax",
        "file": "tax.md"
    },
    "entrepreneurial": {
        "title": "Предпринимательский кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1500000375",
        "category": "civil",
        "file": "entrepreneurial.md"
    },
    "administrative": {
        "title": "Кодекс РК об административных правонарушениях (КоАП)",
        "url": "https://adilet.zan.kz/rus/docs/K1400000272",
        "category": "administrative",
        "file": "administrative.md"
    },
    "criminal": {
        "title": "Уголовный кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1400000226",
        "category": "criminal",
        "file": "criminal.md"
    },
    "criminal_procedure": {
        "title": "Уголовно-процессуальный кодекс РК",
        "url": "https://adilet.zan.kz/rus/docs/K1400000231",
        "category": "criminal",
        "file": "criminal_procedure.md"
    },
    "civil_procedure": {
        "title": "Гражданский процессуальный кодекс РК (ГПК)",
        "url": "https://adilet.zan.kz/rus/docs/K1500000377",
        "category": "civil",
        "file": "civil_procedure.md"
    },
    "family": {
        "title": "Кодекс РК о браке (супружестве) и семье",
        "url": "https://adilet.zan.kz/rus/docs/K1100000518",
        "category": "family",
        "file": "family.md"
    },
    "law_too": {
        "title": "Закон РК о ТОО и товариществах",
        "url": "https://adilet.zan.kz/rus/docs/U980003900_",
        "category": "civil",
        "file": "law_too.md"
    },
    "law_bankruptcy": {
        "title": "Закон РК о реабилитации и банкротстве",
        "url": "https://adilet.zan.kz/rus/docs/Z1400000176",
        "category": "civil",
        "file": "law_bankruptcy.md"
    },
    "law_procurement": {
        "title": "Закон РК о государственных закупках",
        "url": "https://adilet.zan.kz/rus/docs/Z1500000434",
        "category": "civil",
        "file": "law_procurement.md"
    },
    "law_ip": {
        "title": "Закон РК об авторском праве и смежных правах",
        "url": "https://adilet.zan.kz/rus/docs/Z960000006_",
        "category": "civil",
        "file": "law_ip.md"
    },
    "law_consumer": {
        "title": "Закон РК о защите прав потребителей",
        "url": "https://adilet.zan.kz/rus/docs/Z2200000000_",
        "category": "civil",
        "file": "law_consumer.md"
    },
    "law_real_estate": {
        "title": "Закон РК о государственной регистрации прав на недвижимость",
        "url": "https://adilet.zan.kz/rus/docs/Z0700000310_",
        "category": "civil",
        "file": "law_real_estate.md"
    },
    "constitution": {
        "title": "Конституция Республики Казахстан",
        "url": "https://adilet.zan.kz/rus/docs/K950001000_",
        "category": "civil",
        "file": "constitution.md"
    }
}

class AdiletScraper:
    def __init__(self):
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/110.0.0.0 Safari/537.36",
            "Accept-Language": "ru-RU,ru;q=0.9,en-US;q=0.8,en;q=0.7"
        }
        self.storage_dir = os.path.join(os.path.dirname(__file__), "..", "db", "legislation_md")
        os.makedirs(self.storage_dir, exist_ok=True)

    def scrape_catalog_item(self, key):
        if key not in LEGISLATION_CATALOG:
            print(f"Error: Legislation key '{key}' not found in catalog.")
            return False

        item = LEGISLATION_CATALOG[key]
        print(f"\n==================================================")
        print(f"🚀 Scraping Code: {item['title']}")
        print(f"🔗 Source: {item['url']}")
        print(f"==================================================")

        try:
            import urllib3
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)
            response = requests.get(item['url'], headers=self.headers, verify=False, timeout=30)
            response.raise_for_status()
            
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Scrape main document container on Adilet
            content_div = soup.find('div', class_='document-content') or soup.find('div', id='law_content') or soup.find('div', class_='law_content') or soup.find('body')
            
            if not content_div:
                print("❌ Could not find document content div.")
                return False

            # Extract full text
            full_text = content_div.get_text(separator='\n')
            
            # Save raw clean markdown version to local disk for persistence
            local_filepath = os.path.join(self.storage_dir, item['file'])
            with open(local_filepath, "w", encoding="utf-8") as f:
                f.write(f"# {item['title']}\n\nИсточник: {item['url']}\n\n{full_text}")
            print(f"💾 Saved permanent local markdown backup to: {local_filepath}")

            # Parse and ingest into RAG
            self._ingest_text(full_text, item['title'], item['url'], item['category'])
            return True
            
        except Exception as e:
            print(f"❌ Scraping error for {key}: {e}")
            return False

    def _ingest_text(self, text, source_title, source_url, category):
        print(f"🔍 Parsing articles for {source_title}...")
        import hashlib
        
        # Matches "Статья 123" or "123-бап" at typical boundaries
        pattern = r"(Статья\s+\d+|[0-9]+-бап)"
        matches = list(re.finditer(pattern, text))
        
        docs = []
        metas = []
        ids = []
        
        for idx, match in enumerate(matches):
            title = match.group(1).strip()
            start_pos = match.end()
            end_pos = matches[idx+1].start() if idx + 1 < len(matches) else len(text)
            body = text[start_pos:end_pos].strip()
            
            full_text = f"{title}\n{body}"[:8000]
            
            art_num_match = re.search(r"(\d+)", title)
            art_num = art_num_match.group(1) if art_num_match else str(idx + 1)
            
            # Deterministic, unique MD5 hash for idempotency and clash prevention
            content_hash = hashlib.md5(full_text.encode('utf-8')).hexdigest()[:8]
            doc_id = f"scraped_{category}_{art_num}_{content_hash}"
            
            docs.append(full_text)
            metas.append({
                "source": source_title,
                "article": art_num,
                "category": category,
                "url": source_url,
                "type": "scraped"
            })
            ids.append(doc_id)

        total_articles = len(docs)
        print(f"📈 Extracted {total_articles} articles successfully.")
        
        if total_articles == 0:
            print("⚠️ No articles parsed. Skipping ingestion.")
            return

        # Defensive incremental ingestion with rate limit pacing
        batch_size = 20
        total_batches = (total_articles - 1) // batch_size + 1
        print(f"📥 Loading into vector store in {total_batches} batches of {batch_size} articles...")

        for j in range(0, total_articles, batch_size):
            batch_docs = docs[j:j+batch_size]
            batch_metas = metas[j:j+batch_size]
            batch_ids = ids[j:j+batch_size]
            
            print(f"  -> Ingesting batch {j//batch_size + 1}/{total_batches}...")
            rag_service.add_documents(batch_docs, batch_metas, batch_ids)
            
            # Sleep 20s between batches to safely respect free-tier 100 RPM embedding limits
            if j + batch_size < total_articles:
                print("  💤 Sleeping 20 seconds to respect Gemini API rate limits...")
                time.sleep(20)

        print(f"✅ Ingestion complete for {source_title}!")

def main():
    parser = argparse.ArgumentParser(description="Adilet.zan.kz Official RK Legislation Scraper & RAG Ingestor")
    parser.add_argument("--key", type=str, help="Scrape a specific code key (e.g. civil_general, civil_special, labor, tax, law_too, law_procurement)")
    parser.add_argument("--all", action="store_true", help="Scrape and ingest all codes in the catalog sequentially")
    args = parser.parse_args()

    scraper = AdiletScraper()

    if args.all:
        print("🌍 Bulk Scraping Mode: Initiating full RK legislation catalog ingestion!")
        for key in LEGISLATION_CATALOG.keys():
            scraper.scrape_catalog_item(key)
            print("💤 Cooling down for 30 seconds before next code...")
            time.sleep(30)
    elif args.key:
        scraper.scrape_catalog_item(args.key)
    else:
        # Default behavior: help and list options
        print("Usage: python scripts/legislation_scraper.py [--key KEY | --all]")
        print("\nAvailable catalog keys:")
        for k, v in LEGISLATION_CATALOG.items():
            print(f"  - {k:<20} : {v['title']}")

if __name__ == "__main__":
    main()
