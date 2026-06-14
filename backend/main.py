from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
import os
from dotenv import load_dotenv
from database import engine
import models

load_dotenv()

# Initialize DB tables
models.Base.metadata.create_all(bind=engine)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/token")
async def get_token(room: str = "tutor-room", participant: str = "student"):
    """Generate a LiveKit token for the frontend."""
    # Ensure keys exist, otherwise mock
    api_key = os.getenv("LIVEKIT_API_KEY", "devkey")
    api_secret = os.getenv("LIVEKIT_API_SECRET", "secret")
    
    token = api.AccessToken(api_key, api_secret) \
        .with_identity(participant) \
        .with_name(participant) \
        .with_grants(api.VideoGrants(
            room_join=True,
            room=room,
        ))
    return {"token": token.to_jwt()}

@app.get("/")
def read_root():
    return {"status": "Project Newton Backend is running."}
