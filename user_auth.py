import bcrypt
import json
import os

USERS_FILE = "users.json"

def load_users():
    if not os.path.exists(USERS_FILE):
        return {}
    with open(USERS_FILE, "r") as f:
        return json.load(f)

def save_users(users):
    with open(USERS_FILE, "w") as f:
        json.dump(users, f)

def register_user(username, password):
    users = load_users()
    if username in users:
        return False  # User exists
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    users[username] = hashed
    save_users(users)
    return True

def verify_user(username, password):
    users = load_users()
    if username not in users:
        return False
    return bcrypt.checkpw(password.encode(), users[username].encode())