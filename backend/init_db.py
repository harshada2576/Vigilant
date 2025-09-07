import sqlite3
import os

def init_db(db_name="../cipherlink.db", schema_file="schema.sql"):
    # Get the directory of this script
    script_dir = os.path.dirname(os.path.abspath(__file__))
    schema_path = os.path.join(script_dir, schema_file)
    
    with open(schema_path, "r") as f:
        schema = f.read()

    conn = sqlite3.connect(db_name)
    cursor = conn.cursor()
    
    cursor.executescript(schema)
    conn.commit()
    conn.close()

    print(f"Database '{db_name}' initialized successfully.")

if __name__ == "__main__":
    init_db()

