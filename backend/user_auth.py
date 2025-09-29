#                                                        Backend / user_auth.py

import bcrypt
import os
import bcrypt
import sqlite3
import secrets
from datetime import datetime, timedelta, timezone
from backend.config import DB_PATH
import backend.session as helper
import backend.init_db as db

DB_FILE = "cipherlink.db"


def generate_session_token():
    return secrets.token_urlsafe(32)

def hash_password(password):
    """Hashes a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())

def get_connection():
    if os.path.exists(DB_PATH):
        return sqlite3.connect(DB_PATH)
    else:
        db()
        return get_connection()


def load_user():
    token = helper.load_encrypted_session()
    if not token:
        return None
    result = validate_session_token(token)
    if result:
        return {"id": result[0], "display_name": result[1], "token": token}
    return None

def register_user(username, password, display_name):
    if not username or not password:
        return {"success": False, "message": "Username and password cannot be empty."}
    try: 
        conn = get_connection()
        cur = conn.cursor()

        password_hash = hash_password(password)

        cur.execute("""
            INSERT INTO users (username, password_hash, display_name)
            VALUES (?,?,?)
        """, (username, password_hash, display_name))

        conn.commit()
        conn.close()
        return {"success": True, "message": f"User {display_name} registered successfully."}
    
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed: users.username" in str(e):
            return {"success": False, "message": "Username is already taken."}
        return {"success": False, "message": f"Database Integrity Error: {str(e)}"}

    except Exception as e:
        return {"success": False, "message": f"Unexpected Error: {str(e)}"}


def verify_user(username, password):
    if not username or not password:
        return {"success": False, "message": "Username and password are required."}
    
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT id, display_name, password_hash FROM users WHERE username = ?
        """, (username,))
        result = cur.fetchone()
        conn.close()

        if not result:
            return {"success": False, "message": "Invalid username or password."}

        stored_hash = result[2]
    
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):
            user_id = result[0]
            token = create_session(user_id)
            helper.store_encrypted_session(token)
            return {"success": True, "message": f"Welcome Back, {result[1]}!", "token": token}
        else: 
            return {"success": False, "message": "Invalid username or password."}

    except Exception as e:
        return {"success": False, "message": f"login error: {str(e)}"}

<<<<<<< HEAD
=======
def create_session(user_id, duration_minutes=60):
    session_token = generate_session_token()
    expires_at = (datetime.now(timezone.utc) + timedelta(minutes=duration_minutes)).isoformat()

    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        INSERT INTO sessions (user_id, session_token, expires_at) VALUES (?,?,?)
    """, (user_id, session_token, expires_at))
    conn.commit()
    return session_token

def validate_session_token(token):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        SELECT users.id, display_name FROM sessions JOIN users ON sessions.user_id = users.id
        WHERE session_token = ? AND expires_at > CURRENT_TIMESTAMP
    """, (token,))
    return cur.fetchone()

def logout_user(token):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("""
        DELETE FROM sessions WHERE session_token = ?
    """, (token,))
    conn.commit()

    helper.clear_session()

>>>>>>> star
