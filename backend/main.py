from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from livekit import api
import os
from dotenv import load_dotenv
from database import engine, get_db
import models
from sqlalchemy.orm import Session
from sqlalchemy import func

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

@app.get("/api/dashboard/heatmap")
def get_heatmap(db: Session = Depends(get_db)):
    # Group by concept and average the score
    results = db.query(
        models.ConceptMastery.concept_id,
        func.avg(models.ConceptMastery.score).label('average_score')
    ).group_by(models.ConceptMastery.concept_id).all()
    
    return [{"concept": r.concept_id, "score": round(r.average_score, 2)} for r in results]

@app.get("/api/dashboard/struggling")
def get_struggling_students(db: Session = Depends(get_db)):
    traces = db.query(models.SessionTrace).order_by(models.SessionTrace.timestamp.desc()).limit(10).all()
    response = []
    for t in traces:
        response.append({
            "student_name": t.student.name,
            "concept": t.concept,
            "struggle": t.struggle_description,
            "breakthrough": t.breakthrough_description,
            "timestamp": t.timestamp
        })
    return response

@app.get("/")
def read_root():
    return {"status": "Project Newton Backend is running."}
