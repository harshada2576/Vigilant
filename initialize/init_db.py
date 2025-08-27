import sqlite3

def init_db(db_name="cipherlink.db", schema_file="schema.sql"):
    with open(schema_file, "r") as f:
        schema = f.read()

    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    cursor.executescript(schema)
    conn.commit()
    conn.close()

    print(f"Database '{db_name}' initialized successfully.")

if __name__ == "__main__":
    init_db()

