import os
import json
import logging
from typing import Any, Dict, Optional
from dotenv import load_dotenv

# Set up logger
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] %(levelname)s in %(module)s: %(message)s'
)
logger = logging.getLogger("grounding-api")

# Try loading .env from root and parent directories
load_dotenv()  # Default path
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', '.env'))
load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), '..', 'backend', '.env'))

def get_env(key: str, default: Optional[str] = None) -> Optional[str]:
    """Retrieve an environment variable safely."""
    val = os.environ.get(key)
    if not val or val == "your_gemini_api_key_here" or val == "your_groq_api_key_here":
        return default
    return val

def clean_json_text(text: str) -> str:
    """Cleans markdown backticks from LLM JSON responses if they exist."""
    text = text.strip()
    if text.startswith("```json"):
        text = text[7:]
    if text.startswith("```"):
        text = text[3:]
    if text.endswith("```"):
        text = text[:-3]
    return text.strip()

def safe_parse_json(text: str) -> Optional[Dict[str, Any]]:
    """Tries to parse JSON response from LLM safely, cleaning backticks if necessary."""
    cleaned = clean_json_text(text)
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError as e:
        logger.warning(f"Failed to parse LLM response as JSON. Error: {e}. Raw: {text}")
        return None
