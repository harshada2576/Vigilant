import sqlite3

DB_path = "cipherlink.db"

class Manager:
    def __init__(self, username, db_path = DB_path):
        self.username = username
        self.conn = sqlite3.connect(db_path)
        self.conn.row_factory = sqlite3.Row
        self.cur = self.conn.cursor()
        
        self.cur.execute("""
            SELECT id FROM users WHERE username = ?
        """, (username,))
        self.user_id = self.cur.fetchone()['id']

    def send_message(self, conversation_id, sender_id, content):
        self.cur.execute("""
            INSERT INTO messages (conversation_id, sender_id, content) VALUES (?,?,?)
        """, (conversation_id, sender_id, content))

        self.cur.execute("""
            UPDATE conversations SET updated_at = CURRENT_TIMESTAMP WHERE id = ?
        """, (conversation_id,))
        self.conn.commit()

    def get_messages(self, conversation_id, limit=50):
        self.cur.execute("""
            SELECT * FROM messages WHERE conversation_id = ? ORDER BY timestamp DESC LIMIT ?
        """, (conversation_id, limit))

        return self.cur.fetchall()

    def get_conversations(self):
        self.cur.execute("""
            SELECT c.* FROM conversations c JOIN participants p ON c.id = p.conversation_id WHERE p.user_id = ?
        """, (self.user_id,))

        return self.cur.fetchall()

    def create_conversation(self, user_ids, name, is_group=False):
        admin_id = user_id if is_group else None
        self.cur.execute("""
            INSERT INTO conversations (name, is_group, admin_id) VALUES (?,?,?)
        """, (name, is_group, admin_id))
        conversation_id = self.cur.lastrowid

        for uid in user_ids:
            self.cur.execute("""
                INSERT INTO participants (user_id, conversation_id) VALUES (?,?)
            """, (uid, conversation_id))

        self.conn.commit()
        return conversation_id

    def update_last_read(self, user_id, conversation_id, message_id):
        self.cur.execute("""
            UPDATE participants SET last_read_message_id = ? WHERE user_id = ? AND conversation_id = ?
        """, (message_id, user_id, conversation_id))
        self.conn.commit()

    def close(self):
        self.conn.close()
