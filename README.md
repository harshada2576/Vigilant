Gotcha! Here's a **full updated README** for **Cipher Link** with your exact project structure tree and detailed descriptions for each file/folder — super clear and professional:

---

```markdown
# Cipher Link

A modular, secure messaging application.

---

## Project Overview

Cipher Link is a secure, extensible messaging platform built with modularity and scalability in mind. The backend leverages FastAPI, SQLite, and robust encryption, while the UI is designed for future enhancements such as real-time messaging and group chats.

---

## Project Structure

```

.
├── app.log                    # Application logs for debugging and monitoring
├── backend                    # Core backend logic and services
│   ├── auth.py               # Authentication handlers and utilities
│   ├── config.py             # Configuration management (env vars, constants)
│   ├── exceptions.py         # Custom exceptions and error handling
│   ├── init\_db.py            # Database initialization and schema setup
│   ├── **init**.py           # Backend package initializer
│   ├── manager.py            # Business logic for user/conversation management
│   ├── schema.sql            # SQL schema for database structure
│   ├── session.py            # Session management and token handling
│   └── user\_auth.py          # User registration and login processes
├── cipherlink.db             # SQLite database file (auto-generated)
├── Dockerfile                # Docker build configuration for containerization
├── docs                      # Documentation files and roadmaps
│   ├── analsis.md            # Project analysis notes
│   ├── brief-overview\.md     # High-level overview documentation
│   ├── critical\_issues.md    # Known issues and blockers
│   ├── roadmap2.md           # Project roadmap and next steps (version 2)
│   └── roadmap.md            # Initial roadmap and planning
├── main\_api.py               # FastAPI application instance and API endpoints
├── main.py                   # Application entry point, bootstraps the system
├── README.md                 # Project documentation (this file)
├── requirements.txt          # Python package dependencies
├── tests                     # Unit and integration tests
│   ├── api.py                # API endpoint tests
│   ├── clearsession.py       # Session clearing and logout tests
│   ├── database.py           # Database functionality tests
│   └── **init**.py           # Tests package initializer
└── UI                        # User Interface components and widgets (PyQt5)
├── **init**.py           # UI package initializer
├── loading\_widget.py     # Loading spinner widget
├── login\_widget.py       # Login form widget
├── mainwindow\_widget.py  # Main application window
├── newchatdialog.py      # Dialog for starting new chats
└── theme.py              # Styling and UI theming utilities

````

---

## Setup Instructions

1. **Clone the repository:**

   ```bash
   git clone https://github.com/yourusername/cipherlink.git
   cd cipherlink
````

2. **Create and activate a virtual environment (recommended):**

   ```bash
   python3 -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

4. **Run the application:**

   ```bash
   uvicorn main_api:app --reload
   ```

5. **Access API docs:**

   Open [http://localhost:8000/docs](http://localhost:8000/docs) for interactive Swagger UI.

---

## Requirements

Python dependencies are maintained in `requirements.txt`. Some key packages include:

* `bcrypt` — secure password hashing
* `fastapi` — web framework for API
* `pydantic` — data validation
* `cryptography` — encryption utilities
* `python-dotenv` — environment variable management
* `PyQt5` — UI framework

---

## run docker

install docker 

```bash
sudo apt install docker.io
```

build
```bash
sudo docker build -t cipherlink-backend .
```

run
```bash
sudo docker run -d -p 8000:8000 --name cipherlink-app cipherlink-backend
```

---

## Testing

Tests are located in the `tests/` folder. Run them with:

```bash
pytest tests/
```

---

## Future Improvements

* Complete message CRUD endpoints with encryption/decryption
* Implement session refresh tokens and secure session management
* Add real-time messaging with WebSocket support
* Migrate to a production-grade database (e.g., PostgreSQL)
* Dockerize fully and deploy to cloud infrastructure

---

## Contributors

| Name  |
| ----- |
| Ahmed |
| Avhad |

---

For questions or collaboration, feel free to reach out to the contributors!

---


