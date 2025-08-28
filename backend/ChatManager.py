import os
import json
from PyQt5 import QtCore


class ChatManager:
    def __init__(self, username):
        self.username = username
        self.chat_dir = "./stash"
        if not os.path.exists(self.chat_dir):
            os.makedirs(self.chat_dir)

    # -----------------------------------
    # Helpers
    # -----------------------------------
    def get_chat_filename(self, user1, user2):
        users = sorted([user1.lower(), user2.lower()])
        return os.path.join(self.chat_dir, f"{users[0]}-{users[1]}.jsonl")

    def _parse_filename(self, fname):
        """Return (user1, user2) from a chat filename"""
        base = fname.replace(".jsonl", "")
        u1, u2 = base.split("-", 1)
        return u1, u2

    # -----------------------------------
    # Save & Load messages
    # -----------------------------------
    def save_message(self, sender, receiver, message):
        """Save one message to chat file"""
        filename = self.get_chat_filename(sender, receiver)
        entry = {
            "timestamp": QtCore.QDateTime.currentDateTime().toString(QtCore.Qt.ISODate),
            "sender": sender,
            "receiver": receiver,
            "message": message
        }
        with open(filename, "a", encoding="utf-8") as f:
            f.write(json.dumps(entry) + "\n")

    def load_messages(self, user1, user2):
        """Load all messages from a chat file"""
        filename = self.get_chat_filename(user1, user2)
        if not os.path.exists(filename):
            return []
        with open(filename, "r", encoding="utf-8") as f:
            return [json.loads(line) for line in f.readlines()]

    # -----------------------------------
    # Chat list for sidebar
    # -----------------------------------
    def get_chat_list(self):
        """Scan stash folder and return chat previews"""
        chats = []
        for fname in os.listdir(self.chat_dir):
            if fname.endswith(".jsonl"):
                filepath = os.path.join(self.chat_dir, fname)
                with open(filepath, "r", encoding="utf-8") as f:
                    lines = f.readlines()
                    if lines:
                        last_msg = json.loads(lines[-1])
                        u1, u2 = self._parse_filename(fname)
                        # figure out who the contact is
                        contact = u2 if u1 == self.username.lower() else u1
                        chats.append({
                            "name": contact,
                            "timestamp": last_msg.get("timestamp", ""),
                            "last_message": last_msg.get("message", "")
                        })
        # sort by latest message
        chats.sort(key=lambda c: c["timestamp"], reverse=True)
        return chats

    # -----------------------------------
    # New chat creation
    # -----------------------------------
    def create_conversation(self, user1, user2):
        """Ensure chat file exists between two users"""
        filename = self.get_chat_filename(user1, user2)
        if not os.path.exists(filename):
            # create empty file
            with open(filename, "w", encoding="utf-8") as f:
                pass
        return True
