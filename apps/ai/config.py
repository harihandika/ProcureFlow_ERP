import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
GEMINI_MODEL = os.getenv("GEMINI_MODEL", "").strip()
AI_SERVICE_API_KEY = os.getenv("AI_SERVICE_API_KEY", "")
DATABASE_URL = os.getenv("DATABASE_URL")
PORT = int(os.getenv("PORT", 8000))

import logging

logger = logging.getLogger(__name__)

if not GEMINI_API_KEY or GEMINI_API_KEY == "your_api_key_here":
    logger.warning("GEMINI_API_KEY is not set or using default value in .env")
if not GEMINI_MODEL:
    logger.warning("GEMINI_MODEL is not set. AI features will not work.")

if not DATABASE_URL:
    raise ValueError("DATABASE_URL is missing in environment variables.")
