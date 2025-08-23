import os
import json
from PyQt5 import QtCore

class ChatManager:
    def __init__(self,username):
        self.username = username
        self.chat_dir = "./stash"
        if not os.path.exists(self.chat_dir):
            os.makedirs(self.chat_dir)

    def get_chat_filename(self, user1, user2):
        users = sorted([user1.lower(), user2.lower()])
        return os.path.join(self.chat_dir, f"{users[0]}-{users[1]}.jsonl")

    def save_message(self, sender, reciever, message):
        filename = self.get_chat_filename(sender, reciever)
        with open(filename, "a") as f:
            entry = {
                "timestamp": QtCore.QDateTime.currentDateTime().toString(QtCore.Qt.ISODate),
                "sender": sender,
                "reciever": reciever
            }
            f.write(json.dumps(entry) + "\n")
       
    def load_message(self, user1, user2):
        filename = self.get_chat_filename(user1, user2)
        if not os.path.exists(filename):
            return []
        with open(filename, "r") as f:
            return [json.loads(line) for line in f.readlines()]
    
    def get_chat_list(self):
        # Could scan stash folder or just return static for now
        # Example static data:
        return [
            {"name": "Alice", "last_message": "Hey, what's up?", "timestamp": "10:30 AM"},
            {"name": "Bob", "last_message": "Meeting at 2 PM", "timestamp": "Yesterday"},
            {"name": "Charlie", "last_message": "Check this out!", "timestamp": "9:15 AM"}
        }


