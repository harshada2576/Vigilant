# Cipher Link

A modular, secure messaging application.

---

## Project Overview

Cipher Link is a secure, extensible messaging platform built with modularity and scalability in mind. The project now features robust password hashing, normalized database storage (SQLite), and a clear separation between backend logic and UI components. It is designed for future enhancements such as real-time communication, advanced encryption, and group chat support.

---

## Collaboration

| Contributors |
|--------------|
| Ahmed        |
| Avhad        |

---

## Project Structure

| Module/Folder      | Purpose/Description                                      |
|--------------------|---------------------------------------------------------|
| `main.py`          | Main entry point; application bootstrapper              |
| `backend/`         | Core backend logic: database, authentication, chat      |
| `UI/`              | All UI components and widgets                           |
| `cipherlink.db`    | SQLite database file (auto-created/managed)             |
| `requirements.txt` | Python dependencies                                     |
| `README.md`        | Project documentation                                   |
| `migrations/`      | (Optional) Data migration scripts                       |
| `stash/`           | (Legacy) Old message storage for migration/testing      |

---

## Current Status

- **User authentication**: Secure, using hashed passwords and SQLite.
- **Chat storage**: Normalized, scalable database schema for users, conversations, participants, and messages.
- **UI**: Modular widgets for login, main window, and theming.
- **Data migration**: Scripts available to import legacy chat data from `stash/`.
- **Project structure**: Modular, maintainable, and ready for further development.

---

## Roadmap (Prioritized)

1. **Integrate Chat Logic with UI**
   - Seamless sending, receiving, and displaying of messages in the GUI.
2. **Implement Real-Time Messaging**
   - Add networking/server logic for live chat.
3. **Finalize and Test End-to-End Encryption**
   - Ensure all messages are securely encrypted/decrypted.
4. **Enhance Persistence**
   - Robust multi-user and multi-session support.
5. **Improve UI/UX**
   - Usability, accessibility, and visual polish.
6. **Add Unit and Integration Tests**
   - Especially for authentication, encryption, and messaging.
7. **Update Documentation**
   - Keep README and code comments up to date.
8. **Extend Group Chat and Admin Features**
   - Roles, group management, and advanced permissions.
9. **Improve Server-Side Architecture**
   - Prepare for distributed or cloud deployment.
10. **Prepare for Public Release**
    - Security audit, packaging, and deployment scripts.

---

## Getting Started

1. **Clone the repository:**
   ```bash
   git clone https://github.com/seucra/CipherLink.git
   cd CipherLink
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Initialize the SQLite database:**
   ```bash
   python3 backend/init_db.py
   ```

4. **(Optional) Import legacy chat data:**
   ```bash
   python3 migrations/import_stash.py
   ```

5. **Run the application:**
   ```bash
   python3 main.py
   ```

---

## Database Initialization

Cipher Link uses an SQLite database for storing users, conversations, participants, and messages. The schema is defined in `backend/schema.sql`. Running `init_db.py` will create the database and necessary tables automatically.

To reset or create a fresh database, rerun:

```bash
python3 backend/init_db.py
```

---

## Dependencies

- Python 3.8+
- [cryptography](https://pypi.org/project/cryptography/)
- [PyCryptodome](https://pypi.org/project/pycryptodome/)

All dependencies are listed in `requirements.txt`.

---


> **Status:** Active development – core architecture in place, major features being integrated.

