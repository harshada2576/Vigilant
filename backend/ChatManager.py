import os
import json
from PyQt5 import QtCore

class ChatManager:
    def __init__(self, username):
        self.username = username
        self.chat_dir = "./stash"
        if not os.path.exists(self.chat_dir):
            os.makedirs(self.chat_dir)

    def get_chat_filename(self, user1, user2):
        users = sorted([user1.lower(), user2.lower()])
        return os.path.join(self.chat_dir, f"{users[0]}-{users[1]}.jsonl")

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
                        chats.append({
                            "name": fname.replace(".jsonl", ""),
                            "last_message": last_msg.get("message", ""),
                            "timestamp": last_msg.get("timestamp", "")
                        })
        return chats
