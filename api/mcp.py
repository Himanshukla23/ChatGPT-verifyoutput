import google.generativeai as genai
from groq import Groq
from api.utils import get_env, logger

class ModelClients:
    """Manages LLM client initialization and diagnostic connectivity checks."""
    
    def __init__(self):
        self.gemini_client = None
        self.groq_client = None
        
        gemini_key = get_env("GEMINI_API_KEY")
        groq_key = get_env("GROQ_API_KEY")
        
        if gemini_key:
            try:
                genai.configure(api_key=gemini_key)
                self.gemini_client = genai
                logger.info("[Gemini] Client initialized successfully.")
            except Exception as e:
                logger.warning(f"[Gemini] Failed to initialize client: {e}")
        else:
            logger.info("[Gemini] API Key not configured or uses placeholder.")
            
        if groq_key:
            try:
                self.groq_client = Groq(api_key=groq_key)
                logger.info("[Groq] Client initialized successfully.")
            except Exception as e:
                logger.warning(f"[Groq] Failed to initialize client: {e}")
        else:
            logger.info("[Groq] API Key not configured or uses placeholder.")

    def has_gemini(self) -> bool:
        return self.gemini_client is not None

    def has_groq(self) -> bool:
        return self.groq_client is not None

# Shared singleton instance
clients = ModelClients()
