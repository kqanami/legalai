"""
Quick test script for Anthropic Claude API key & model switching.
Run from backend directory: python scripts/test_claude_api.py
"""
import os
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

# Load .env from backend dir
sys.path.insert(0, os.path.dirname(os.path.dirname(__file__)))
from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"))

try:
    import anthropic
except ImportError:
    print("FAIL: anthropic package not installed. Run: pip install anthropic")
    sys.exit(1)

API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MODELS_TO_TEST = [
    ("claude-sonnet-4-5", "Fast / Standard"),
    ("claude-opus-4-5",   "Smart / Premium"),
]
TEST_PROMPT = "Kratko (1 predlozhenie): chto takoe Grazhdanskiy kodeks Respubliki Kazakhstan?"

def test_model(client, model_id: str, label: str):
    print(f"\n{'='*55}")
    print(f"  Test: {label}")
    print(f"  Model: {model_id}")
    print(f"{'='*55}")
    try:
        t0 = time.perf_counter()
        response = client.messages.create(
            model=model_id,
            max_tokens=256,
            messages=[{"role": "user", "content": TEST_PROMPT}]
        )
        elapsed = time.perf_counter() - t0
        text = response.content[0].text.strip()
        usage = response.usage
        print(f"  OK  Response ({elapsed:.2f}s):\n  {text}")
        print(f"  Tokens: in={usage.input_tokens}, out={usage.output_tokens}")
    except anthropic.AuthenticationError:
        print(f"  FAIL: AuthenticationError - key invalid or expired.")
    except anthropic.NotFoundError:
        print(f"  FAIL: Model '{model_id}' not found or not available for this key.")
    except Exception as e:
        print(f"  FAIL: {type(e).__name__}: {e}")

def main():
    print("\n=== Anthropic Claude API - Key & Model Test ===")
    key_preview = f"{API_KEY[:8]}...{API_KEY[-4:]}" if len(API_KEY) > 12 else "NOT SET"
    print(f"  API Key: {key_preview}")

    if not API_KEY or API_KEY == "PASTE_YOUR_NEW_KEY_HERE":
        print("FAIL: ANTHROPIC_API_KEY not set in .env")
        sys.exit(1)

    client = anthropic.Anthropic(api_key=API_KEY)

    for model_id, label in MODELS_TO_TEST:
        test_model(client, model_id, label)

    print(f"\n{'='*55}")
    print("  Done! Use working model in .env:")
    print("  LLM_MODEL_FAST=claude-sonnet-4-5")
    print("  LLM_MODEL_SMART=claude-opus-4-5")
    print(f"{'='*55}\n")

if __name__ == "__main__":
    main()
