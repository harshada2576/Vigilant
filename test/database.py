from backend.manager import Manager

manager = Manager("username1")
cid = manager.create_conversation([1, 2], "Chat")
manager.send_message(cid, 1, "Yo bro wassup!")

# Verify message is inserted
messages = manager.get_messages(cid)
for msg in messages:
    print(dict(msg))

