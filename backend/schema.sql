-- 1. Enable Foreign Keys (Always good practice)
PRAGMA foreign_keys = ON;

-- Delete Tables if exist
DROP TABLE IF EXISTS "sessions";
DROP TABLE IF EXISTS "messages";
DROP TABLE IF EXISTS "participants";
DROP TABLE IF EXISTS "conversations";
DROP TABLE IF EXISTS "users";

-- Users table: stores user credentials and information
CREATE TABLE IF NOT EXISTS "users" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password_hash BLOB NOT NULL,  -- ← changed from TEXT to BLOB
    display_name TEXT,
    email TEXT UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP
);

-- Conversations table: stores chat groups or direct chats
CREATE TABLE IF NOT EXISTS "conversations" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    is_group BOOLEAN DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    admin_id INTEGER,
    FOREIGN KEY(admin_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Participants table: links users to conversations
CREATE TABLE IF NOT EXISTS "participants" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    conversation_id INTEGER NOT NULL,
    joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    role TEXT DEFAULT 'member',
    last_read_message_id INTEGER,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY(last_read_message_id) REFERENCES messages(id) ON DELETE SET NULL,
    UNIQUE(user_id, conversation_id)
);

-- Messages table: stores messages sent in conversations
CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    conversation_id INTEGER NOT NULL,
    sender_id INTEGER,
    content BLOB NOT NULL,  -- ⬅️ Store binary hash here
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status TEXT DEFAULT 'sent',
    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE,
    FOREIGN KEY(sender_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Session table: using cookies can help protect user sessions and prevent security leaks
CREATE TABLE IF NOT EXISTS "sessions" (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    session_token TEXT UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

