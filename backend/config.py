import os
from dotenv import load_dotenv

load_dotenv()

DB_PATH = os.getenv("DB_PATH", "cipherlink.db")
SERVICE_NAME = os.getenv("SERVICE_NAME", "CipherLinkApp")
SESSION_ID = os.getenv("SESSION_ID", "user_session")
