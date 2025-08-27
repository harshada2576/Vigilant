# Cipher Link

A modular, secure messaging application.

---

## Project Overview

Cipher Link is a work-in-progress secure messaging platform designed with modularity and extensibility in mind. The project aims to provide robust encryption, real-time communication, and a user-friendly interface.

---

## Collaboration

| Contributors |
|--------------|
| Ahmed        |
| Avhad        |

---

## Project Structure

| Module/Folder      | Purpose/Description                                      |
|-------------------|---------------------------------------------------------|
| `main.py`         | Main entry point; application bootstrapper              |
| `chat_messenger/` | Core messaging logic (sending, receiving, processing)   |
| `widgets.py`      | UI components and reusable widgets                       |
| `encryption/`     | Encryption/decryption logic and cryptographic utilities |
| `theme/`          | Theming, color palettes, and UI styling                  |
| `stash/`          | Local message storage (`user1-user2.jsonl` per chat)     |

> **Note:** Each module is designed to be self-contained and easily testable.

---

## Roadmap

- [ ] Integrate chat logic with UI for seamless messaging  
- [ ] Refactor modules for clarity and maintainability  
- [ ] Finalize and test encryption (end-to-end)  
- [ ] Implement real-time messaging (network/server logic)  
- [ ] Enhance persistence for multi-user and multi-session support  
- [ ] Improve UI/UX (usability, accessibility, aesthetics)  
- [ ] Add unit and integration tests (especially for encryption and messaging)  
- [ ] Update documentation and code comments  
- [ ] Extend encryption and dataset capabilities  
- [ ] Improve server-side architecture  
- [ ] Prepare for public release  

---

## Recommended Current Focus

- **Integrate Chat Logic with UI:** Ensure sending, receiving, and displaying messages works seamlessly in the GUI.  
- **Finalize and Test Encryption:** Guarantee all messages are securely encrypted and decrypted.  
- **Implement Real-Time Messaging:** Add networking/server logic for real-time chat.  
- **Improve Persistence:** Robustly handle message storage for multiple users and sessions.  
- **Enhance UI/UX:** Polish the interface for usability and aesthetics.  
- **Testing:** Add comprehensive unit and integration tests.  
- **Documentation:** Keep README and code comments up to date.  

---

## Getting Started

1. Clone the repository:

   ```bash
   git clone https://github.com/seucra/CipherLink.git
   cd CipherLink
   ````

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Initialize the SQLite database (creates `cipherlink.db`):

   ```bash
   python3 initialize/init_db.py
   ```

   You can specify a custom database filename:

   ```bash
   python3 initialize/init_db.py mydatabase.db
   ```

4. Run the application:

   ```bash
   python3 main.py
   ```

---

## Database Initialization

Cipher Link uses an SQLite database for storing users, conversations, participants, and messages. The database schema is defined in `initialize/schema.sql`. Running `init_db.py` will create the database and necessary tables automatically.

To reset or create a fresh database, rerun:

```bash
python3 initialize/init_db.py
```

---

## Dependencies

* Python 3.8+
* [cryptography](https://pypi.org/project/cryptography/)
* [PyCryptodome](https://pypi.org/project/pycryptodome/)

All dependencies are listed in `requirements.txt`.

---

> *Status: Active development*

