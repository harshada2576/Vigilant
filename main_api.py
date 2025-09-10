from fastapi import FastAPI, HTTPException, status, Depends, Header, Body
from typing import List, Optional
from pydantic import BaseModel
import logging
from backend import user_auth
from backend.auth import get_current_user

app = FastAPI(title="CipherLink API")

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("app.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger(__name__)

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
    logger.info(f"Register attempt for {requset.username}")
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
    logger.info(f"Login attempt for {requset.username}")
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
    logger.info(f"Create conversation attempt for {current['user']}")
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
    logger.info(f"Get conversation attempt for {current['user']}")
    manager = Manager(current["token"])
    conversations = manager.get_conversations()
    manager.close()
    return conversations

@app.get("/get_messages")
def get_messages(
    conversation_id: int, limit: int = 50, current=Depends(get_current_user)
):
    logger.info(f"Get message attempt for {current['user']}")
    manager = Manager(current["token"])
    messages = manager.get_messages(conversation_id, limit)
    manager.close()
    return {"success": True, "messages": messages}

@app.post("/send_message")
def send_message(
    conversation_id: int,
    content: str,
    current=Depends(get_current_user)
):
    logger.info(f"Send message attempt for {current['user']}")
    manager = Manager(current("token"))
    manager.send_message(conversation_id, content)
    manager.close()
    return {"success": True, "message": "message sent successfully."}

# Let users fetch their info if they’re logged in.
@app.get("/me")
def get_current_user(token: str = Header(...)):
    user = user_auth.validate_session_token(token)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid or Expired Token.")
    return {"success": True, "user_id": user[0]}



# basemodel for update last read
class UpdateLastReadRequest(BaseModel):
    coversation_id: int
    message_id: int

@app.post("/update_last_read")
def update_last_read(
    request: UpdateLastReadRequest,
    current=Depends(get_current_user)
):
    logger.info(f"Update Last Read attempt for {current['user']}")
    manager = Manager(current["token"])
    manager.update_last_read(
        current["user"][0],
        request.conversation_id,
        request.message_id
    )
    manager.close()
    return {"success": True, "message": "Last read message updated."}

# logout api endpoint
@app.post("/logout")
def logout_user(current=Depends(get_current_user)):
    logger.info(f"Logout attempt for {current['user']}")
    token = current["token"]
    user_auth.logout_user(token)
    return {"success": True, "message": "Logged out successfully."}
