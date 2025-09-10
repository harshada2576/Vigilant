from fastapi.testclient import TestClient
from main_api import app

client = TestClient(app)

def test_register_and_login():
    res = client.post("/register", json={
        "username": "testuser",
        "password": "testpass",
        "display_name": "Test User"
    })
    assert res.status_code == 200 or res.status_code == 400  # already exists?

    res = client.post("/login", json={
        "username": "testuser",
        "password": "testpass"
    })
    assert res.status_code == 200
    assert "token" in res.json()

