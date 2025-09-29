from fastapi import Header, HTTPException, status, Depends
import backend.user_auth as user_auth

def get_current_user(token: str = Header(...)):
    user = user_auth.validate_session_token(token)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-AUTHENTICATE": "Bearer"},
        )
    return {"user": user, "token": token}
