import bcrypt
import os
import sqlite3


DB_path = "cipherlink.db"

def hash_password(password):
    """Hashes a password using bcrypt."""
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())


def get_connection(db_path=DB_path):
    if os.path.exists(db_path):
        return sqlite3.connect(db_path)
    else:
        print(f"Databse file : {path} : does not exists.")
        return None


def load_user(user):
    pass

def register_user(username, password):
    if not username or not password:
        return {"success": False, "message": "Username and password cannot be empty."}
    try: 
        conn = get_connection()
        cur = conn.cursor()

        password_hash = hash_password(password)

        cur.execute("""
            INSERT INTO users (username, password_hash)
            VALUES (?,?)
        """, (username, password_hash))

        conn.commit()
        conn.close()
        return {"success": True, "message": "Username: {username} registered successfully."}
    
    except sqlite3.IntegrityError as e:
        if "UNIQUE constraint failed: users.username" in str(e):
            return {"success": False, "message": "Username: {username} is already taken."}
        return {"success": False, "message": f"Database Integrity Error: {str(e)}"}

    except Exception as e:
        return {"success": False, "message": f"Unexpected Error: {str(e)}"}


def verify_user(username, password, db_path=DB_path):
    if not username or not password:
        return {"success": False, "message": "Username and password are required."}
    
    try:
        conn = get_connection()
        cur = conn.cursor()

        cur.execute("""
            SELECT password_hash FROM users WHERE username = ?
        """, (username,))
        result = cur.fetchone()
        conn.close()

        if not result:
            return {"success": False, "message": "Invalid username or password."}

        stored_hash = result[0]
    
        if bcrypt.checkpw(password.encode('utf-8'), stored_hash):  
            return {"success": True, "message": f"Welcome Back, {username}!"}
        else: 
            return {"success": False, "message": "Invalid username or password."}

    except Exception as e:
        return {"success": False, "message": f"login error: {str(e)}"}
