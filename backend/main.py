from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime
import models
import auth
from database import engine, get_db
from ai_agent import agent
from langchain_core.messages import HumanMessage, AIMessage

# Create tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="cfanatic API")

# CORS - Explicitly allow frontend origin
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5174",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:5173",
    ],  # Frontend URLs
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

# Pydantic Models
class UserCreate(BaseModel):
    username: str
    email: str
    password: str

class UserLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class KeyUpdate(BaseModel):
    gemini_key: str
    cf_handle: Optional[str] = None  # Codeforces handle

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[int] = None  # If None, creates a new session

# Auth Endpoints
@app.post("/register", response_model=Token)
def register(user: UserCreate, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if db_user:
        raise HTTPException(status_code=400, detail="Username already registered")
    
    hashed_password = auth.get_password_hash(user.password)
    new_user = models.User(username=user.username, email=user.email, hashed_password=hashed_password)
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    
    access_token = auth.create_access_token(data={"sub": new_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.post("/token", response_model=Token)
def login(user: UserLogin, db: Session = Depends(get_db)):
    db_user = db.query(models.User).filter(models.User.username == user.username).first()
    if not db_user or not auth.verify_password(user.password, db_user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token = auth.create_access_token(data={"sub": db_user.username})
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/users/me")
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    return {"username": current_user.username, "email": current_user.email}

# Key Management
from cryptography.fernet import Fernet
import os

# Generate a key if not exists (in production, load from env)
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", Fernet.generate_key().decode())
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

def encrypt_key(key: str) -> str:
    if not key: return None
    return cipher_suite.encrypt(key.encode()).decode()

def decrypt_key(encrypted_key: str) -> str:
    if not encrypted_key: return None
    try:
        return cipher_suite.decrypt(encrypted_key.encode()).decode()
    except:
        return None

@app.post("/keys")

async def update_keys(keys: KeyUpdate, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    user_keys = db.query(models.UserKeys).filter(models.UserKeys.user_id == current_user.id).first()
    if not user_keys:
        user_keys = models.UserKeys(user_id=current_user.id)
        db.add(user_keys)
    
    if keys.gemini_key: user_keys.gemini_api_key = encrypt_key(keys.gemini_key)
    if keys.cf_handle: user_keys.cf_handle = keys.cf_handle  # Store handle as plain text
    
    db.commit()
    return {"status": "keys updated"}

@app.get("/keys")
async def get_keys(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    user_keys = db.query(models.UserKeys).filter(models.UserKeys.user_id == current_user.id).first()
    if not user_keys:
        return {"has_keys": False}
    return {
        "has_keys": True, 
        "gemini_configured": bool(user_keys.gemini_api_key),
        "cf_configured": bool(user_keys.cf_handle),
        "cf_handle": user_keys.cf_handle if user_keys.cf_handle else None
    }

# Chat History Endpoints
@app.get("/chat/sessions")
async def get_chat_sessions(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    sessions = db.query(models.ChatSession).filter(
        models.ChatSession.user_id == current_user.id
    ).order_by(models.ChatSession.updated_at.desc()).limit(20).all()
    
    return [{
        "id": session.id,
        "title": session.title,
        "updated_at": session.updated_at.isoformat(),
        "message_count": len(session.messages)
    } for session in sessions]

@app.get("/chat/sessions/{session_id}")
async def get_chat_session(session_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": session.id,
        "title": session.title,
        "messages": [{
            "role": msg.role,
            "content": msg.content,
            "created_at": msg.created_at.isoformat()
        } for msg in session.messages]
    }

@app.post("/chat/sessions")
async def create_chat_session(current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    session = models.ChatSession(user_id=current_user.id, title="New Chat")
    db.add(session)
    db.commit()
    db.refresh(session)
    return {"id": session.id, "title": session.title}

@app.delete("/chat/sessions/{session_id}")
async def delete_chat_session(session_id: int, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    session = db.query(models.ChatSession).filter(
        models.ChatSession.id == session_id,
        models.ChatSession.user_id == current_user.id
    ).first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    db.delete(session)
    db.commit()
    return {"status": "deleted"}

# Chat Endpoint
@app.post("/chat")
async def chat(request: ChatRequest, current_user: models.User = Depends(auth.get_current_user), db: Session = Depends(get_db)):
    user_keys = db.query(models.UserKeys).filter(models.UserKeys.user_id == current_user.id).first()
    
    gemini_key = decrypt_key(user_keys.gemini_api_key) if user_keys else None
    
    if not gemini_key:
         if request.message.startswith("TEST_KEY:"):
             gemini_key = request.message.split("TEST_KEY:")[1].strip()
         else:
            raise HTTPException(status_code=400, detail="Gemini API Key not found. Please configure it in settings.")

    # Get or create session
    if request.session_id:
        session = db.query(models.ChatSession).filter(
            models.ChatSession.id == request.session_id,
            models.ChatSession.user_id == current_user.id
        ).first()
        if not session:
            raise HTTPException(status_code=404, detail="Session not found")
    else:
        # Create new session with title from first message
        title = request.message[:50] + "..." if len(request.message) > 50 else request.message
        session = models.ChatSession(user_id=current_user.id, title=title)
        db.add(session)
        db.commit()
        db.refresh(session)

    # Save user message
    user_message = models.ChatMessage(session_id=session.id, role="user", content=request.message)
    db.add(user_message)
    db.commit()

    # Load history from session
    history_messages = []
    for msg in session.messages[:-1]:  # Exclude the message we just added
        if msg.role == "user":
            history_messages.append(HumanMessage(content=msg.content))
        else:
            history_messages.append(AIMessage(content=msg.content))

    # Get CF handle from stored keys
    cf_handle = user_keys.cf_handle if user_keys and user_keys.cf_handle else current_user.username
    
    response = await agent.process_message(
        message=request.message,
        user_handle=cf_handle,
        gemini_key=gemini_key,
        history=history_messages
    )
    
    # Save AI response
    ai_message = models.ChatMessage(session_id=session.id, role="model", content=response)
    db.add(ai_message)
    
    # Update session timestamp
    session.updated_at = datetime.utcnow()
    db.commit()
    
    return {"response": response, "session_id": session.id}

class RagIngestRequest(BaseModel):
    text: str
    metadata: Optional[dict] = None

@app.post("/rag/ingest")
async def ingest_rag(request: RagIngestRequest, current_user: models.User = Depends(auth.get_current_user)):
    from rag import rag_system
    rag_system.add_documents([request.text], [request.metadata] if request.metadata else None)
    return {"status": "Document ingested"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
