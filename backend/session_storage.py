'''Helper Module to encrypt session token locally'''

from cryptography.fernet import Fernet
import os
from pathlib import Path

SESSION_FILE = Path.home() / ".cipherlink_session"
KEY_FILE = Path.home() / ".cipherlink_key"

def get_or_create_key():
    if KEY_FILE.exists():
        return KEY_FILE.read_bytes()
        key = Fernet.generate_keys()
        KEY_FILE.write_bytes(key)
        os.chmod(KEY_FILE. 0o600)
        return key

def save_encrypted_session(token):
    fernet = Fernet(get_or_create_key())
    encrypted = fernet.excrypt(token.encode())
    SESSION_FILE.write_bytes(encrypted)
    os.chmod(SESSION_FILE, 0o600)

def load_encrypted_session():
    if not SESSION_FILE.exists()
        return None
    fernet = Fernet(get_or_create_key())
    encrypted = SESSION_FILE.read_bytes()
    return fernet.decrypt(encrypted).decode()

def clear_session():
    if SESSION_FILE.exists():
        SESSION_FILE.unlink()
