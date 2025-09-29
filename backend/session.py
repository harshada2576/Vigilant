#                                                    backend / session.py

import os
import keyring                              # OS keyring (or operating system keyring) is a secure way to store sensitive information, like passwords, tokens, or cookies, using the native credential storage system of the operating system instead of saving them in plain-text local files.
from backend.config import SERVICE_NAME, SESSION_ID
from cryptography.fernet import Fernet

# this is for when we make it available for multiple users in same machine
local_user_id = 1

KEY_NAME = "encryption_key_{local_user_id}"                         # to have each user in same machine have different logins and not share saem encryption key


def get_or_create_key():
    key = keyring.get_password(SERVICE_NAME, KEY_NAME)
    if key:
        return key.encode()

    new_key = Fernet.generate_key()
    keyring.set_password(SERVICE_NAME, KEY_NAME, new_key.decode())
    return new_key

def store_encrypted_session(token):
    fernet = Fernet(get_or_create_key())
    encrypted_token = fernet.encrypt(token.encode()).decode()
    keyring.set_password(SERVICE_NAME, SESSION_ID, encrypted_token)

def load_encrypted_session():
    encrypted = keyring.get_password(SERVICE_NAME, SESSION_ID)
    if not encrypted:
        return None
    key = Fernet(get_or_create_key())
    try:
        return key.decrypt(encrypted.encode()).decode()
    except Exception:
        return None

def clear_session():
    try:
        keyring.delete_password(SERVICE_NAME, SESSION_ID)
    except keyring.errors.PasswordDeleteError:
        pass  # It's okay if the password doesn't exist
