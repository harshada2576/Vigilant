
# **Cipherlink Project Report**

## 1. **Project Overview**

Cipherlink is a desktop encrypted chat application built using **PyQt5** for the UI and **SQLite** for local data storage. It features secure user authentication, encrypted messaging, group and direct chats, and session management.

---

## 2. **Directory Structure**

* **backend/**
  Contains core logic and database interaction modules:

  * `init_db.py`: Initializes the SQLite database schema.
  * `manager.py`: Main backend manager class to handle messaging, conversations, and participants.
  * `schema.sql`: SQL schema defining tables like users, conversations, messages, sessions.
  * `session_storage.py`: Handles local encrypted session token storage.
  * `user_auth.py`: User authentication logic, password hashing, session token creation and validation.

* **UI/**
  PyQt5 UI components and theming:

  * `login_widget.py`, `mainwindow_widget.py`, `newchatdialog.py`, `loading_widget.py`: UI widgets.
  * `theme.py`: Centralized theming with multiple palettes and QSS styling.

* **test/**
  Unit and integration tests for database and UI.

* **main.py**
  Entry point for the application (presumably bootstraps UI and backend).

* **cipherlink.db**
  SQLite database file.

* **requirements.txt**
  Dependencies, including PyQt5, bcrypt, cryptography.

---

## 3. **Key Features**

* **User Authentication**

  * Passwords are hashed with bcrypt.
  * Sessions are stored encrypted locally using Fernet symmetric encryption (session token).
  * Session tokens stored in DB with expiration for security.

* **Encrypted Messaging**

  * Messages are encrypted before storage using a key managed in `session_storage.py`.
  * Decryption on retrieval ensures secure storage at rest.

* **Conversation Management**

  * Supports both group chats and direct messages.
  * Conversation metadata stored (name, group flag, admin).
  * Participants managed in a separate table linking users to conversations.

* **Theming & UI**

  * Supports multiple color palettes (light, medium, dark).
  * QSS-based dynamic styling with helper functions to apply themes recursively.
  * User-friendly dialogs like NewChatDialog with validation and toggleable fields.

* **Database Schema**

  * Enforces foreign keys for relational integrity.
  * Tables for users, conversations, participants, messages, sessions.

---

## 4. **Security Considerations**

* Passwords hashed with bcrypt, not stored in plaintext.
* Session tokens are securely generated and stored encrypted locally.
* SQLite foreign keys enabled for integrity.
* Message content encrypted using symmetric encryption before storage.

---

## 5. **Potential Improvements**

* **Error Handling**:
  Some backend methods return dictionaries with success/failure states; consider exceptions or a more uniform error handling strategy.

* **Session Expiry Handling**:
  UI should handle expired sessions gracefully, prompting re-login.

* **Key Management**:
  Currently, encryption key is generated and stored locally. Consider how key rotation or multi-device sync might work.

* **UI/UX**:

  * Loading indicators on network/db calls.
  * Input validation in dialogs (e.g., usernames format, chat names).
  * More polished theme switching at runtime.

* **Testing**:
  Ensure test coverage for critical flows — registration, login, message encryption/decryption.

---

## 6. **Summary**

Cipherlink is a solid encrypted chat app foundation combining:

* Secure backend with session and password management.
* Encrypted messages stored safely.
* Flexible UI with theming and modular dialogs.
* A clear, scalable directory structure.

If you want, I can help with specific improvements, feature additions, or code reviews next!

---


