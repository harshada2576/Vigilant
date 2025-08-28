import bcrypt
import sqlite3
import os

DB_FILE = "cipherlink.db"

# Ensure the database and table exist
def initialize_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("""
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            display_name TEXT,
            email TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

# Get database connection
def get_connection():
    return sqlite3.connect(DB_FILE)

# Register a new user
def register_user(username, password):
    initialize_db()
    conn = get_connection()
    cursor = conn.cursor()
    
    # Check if user already exists
    cursor.execute("SELECT username FROM users WHERE username=?", (username,))
    if cursor.fetchone():
        print("User already exists!")
        conn.close()
        return False
    
    # Hash the password
    password_hash = bcrypt.hashpw(password.encode(), bcrypt.gensalt())
    
    # Store user
    cursor.execute("INSERT INTO users (username, password_hash) VALUES (?, ?)",
                   (username, password_hash))
    conn.commit()
    conn.close()
    print("User registered successfully!")
    return True

# Verify user login
def verify_user(username, password):
    initialize_db()
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("SELECT password_hash FROM users WHERE username=?", (username,))
    result = cursor.fetchone()
    conn.close()
    
    if result is None:
        return False  # user not found
    
    stored_hash = result[0]  # this is bytes from BLOB
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode('utf-8')  # safety, though BLOB returns bytes
    
    return bcrypt.checkpw(password.encode(), stored_hash)
