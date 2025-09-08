#                                                        backend / manager.py
# change to work with token instead of username

import sqlite3
from cryptography.fernet import Fernet
import backend.session as helper
from backend.exceptions import SessionExpiredError
from backend.user_auth import validate_session_token

DB_path = "cipherlink.db"

class Manager:
    def __init__(self, token, db_path = DB_path):
        self.user = validate_session_token(token)
        if not self.user:
            raise SessionExpiredError("Invalid or Expired Session.")

        self.user_id = self.user[0]
        self.token = token

        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()
        self.conn.execute("PRAGMA foreign_keys = ON")

    def send_message(self, conversation_id, content):
        key = helper.get_or_create_key()        # using the key stored for password for messages
        cipher = Fernet(key)

        message = cipher.encrypt(content.encode('utf-8'))

        self.cur.execute("""
            INSERT INTO messages (conversation_id, sender_id, content) VALUES (?,?,?)
        """, (conversation_id, self.user_id, message))

        self.cur.execute("""
            UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
        """, (conversation_id,))
        self.conn.commit()

    def get_messages(self, conversation_id, limit=50):
        key = helper.get_or_create_key()        # using the key stored for password for messages
        cipher = Fernet(key)

        self.cur.execute("""
            SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?
        """, (conversation_id, limit))

        dataset = self.cur.fetchall()
        result = []
        for row in dataset:
            data = dict(row)
            data['content'] = cipher.decrypt(data['content']).decode('utf-8')
            result.append(data)

        return result

    def get_conversations(self):
        self.cur.execute("""
            SELECT c.* FROM conversations c JOIN participants p ON c.id = p.conversation_id WHERE p.user_id = ?
        """, (self.user_id,))

        return self.cur.fetchall()

    def create_conversation(self, user_names, conversation_name=None, is_group=False):
        admin_id = self.user_id if is_group else None
        user_ids = []
        for name in user_names:
            self.cur.execute("""
                SELECT id FROM users WHERE username = ?
            """, (name,))
            result = self.cur.fetchone()
            if not result:
                return {"success": False, "message": f"User :{name}: not in database."}
            else:
                user_ids.append(result[0])

        self.cur.execute("""
            INSERT INTO conversations (name, is_group, admin_id) VALUES (?,?,?)
        """, (conversation_name, is_group, admin_id))
        conversation_id = self.cur.lastrowid

        user_ids.append(self.user_id)
        for uid in user_ids:
            self.cur.execute("""
                INSERT INTO participants (user_id, conversation_id) VALUES (?,?)
            """, (uid, conversation_id))

        self.conn.commit()
        return {"success": True, "message": conversation_id}

    def update_last_read(self, user_id, conversation_id, message_id):
        self.cur.execute("""
            UPDATE participants SET last_read_message_id = ? WHERE user_id = ? AND conversation_id = ?
        """, (message_id, user_id, conversation_id))
        self.conn.commit()

    def logout_user(self):
        self.cur.execute("""
            DELETE FROM sessions WHERE session_token = ?
        """, (token,))
        self.conn.commit()
        
        helper.clear_session()

    def close(self):
        self.conn.close()
