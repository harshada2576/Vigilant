from pydantic import BaseModel
from typing import List, Optional
from fastapi import FastAPI, HTTPException, status
from backend import user_auth, auth.get_current_user as get_current_user

app = FastAPI(title="CipherLink API")

# (lock) request body models
class RegisterRequest(BaseModel):
    username: str
    password: str
    display_name: str

class LoginRequest(BaseModel):
    username: str
    password: str

# Register endpoint
@app.post("/register")
def register_user(request: RegisterRequest):
    result = user_auth.register_user(
        request.username,
        request.password,
        request.display_name
    )
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=result["message"])
    return result

# (key) login endpoint
@app.post("/login")
def login_user(request: LoginRequest):
    result = user_auth.verify_user(
        request.username,
        request.password
    )
    if not result["success"]:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=result["message"])
    return result

# Chat Endpoints
class CreateConversationRequest(BaseModel):
    user_names: List[str]
    conversation_name: Optional[str] = None
    is_group: Optional[bool] = False

@app.post("/create_conversation")
def create_conversation(
    request: CreateConversationRequest, 
    current=Depends(get_current_user)
):
    user = current["user"]
    token = current["token"]
    manager = Manager(token)
    result = manager.create_conversation(
        user_names = request.user_names,
        conversation_name=request.conversation_name,
        is_group=request.is_group
    )
    manager.close()
    if not result["success"]:
        raise HTTPException(status_code=HTTP_400_BAD_REQUEST, detail=result["message"])
    return result

@app.get("/get_conversation")
def get_conversation(current=Depends(get_current_user)):
    manager = Manager(current["token"])
    conversations = manager.get_conversations()
    manager.close()
    return conversations

@app.get("/get_messages")
def get_messages(
    conversation_id: int, limit: int = 50, current=Depends(get_current_user)
):
    manager = Manager(current["token"])
    messages = manager.get_messages(conversation_id, limit)
    manager.close()
    return messages

@app.post("/send_message")
def send_message(
    conversation_id: int,
    content: str,
    current=Depends(get_current_user)
):
    user = current["user"]                                          # current contains {"user": (user_id,), "token": token}
    token = current["token"]
    manager = Manager(user[0])                                      # user manager class with token


# Let users fetch their info if they’re logged in.
@app.get("/me")
def get_current_user(token: str = Header(...)):
    user = user_auth.validate_session_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or Expired Token")
    return {"user_id": user[0]}



