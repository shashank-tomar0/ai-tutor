from fastapi import FastAPI, Depends, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
import os
import json
from dotenv import load_dotenv
from app.core.database import engine, get_db
from app.models import domain as models
from sqlalchemy.orm import Session
from sqlalchemy import func
from groq import AsyncGroq

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

groq_client = AsyncGroq(api_key=os.environ.get("GROQ_API_KEY"))

@app.websocket("/ws/chat")
async def websocket_chat(websocket: WebSocket):
    await websocket.accept()
    
    # Keep track of conversation history
    chat_history = [
        {"role": "system", "content": "You are Project Newton, a Socratic math tutor. You receive the student's transcribed speech and a JSON of their digital canvas. Guide them with short, conversational responses. Do not give direct answers."}
    ]
    
    try:
        while True:
            data = await websocket.receive_text()
            payload = json.loads(data)
            
            transcript = payload.get("transcript", "")
            shapes = payload.get("shapes", [])
            
            # Combine canvas state and spoken text
            user_message = f"Canvas state: {json.dumps(shapes)}\n\nStudent says: {transcript}"
            chat_history.append({"role": "user", "content": user_message})
            
            print(f"Received from student: {transcript}")
            
            # Query Groq
            response = await groq_client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=chat_history,
                temperature=0.7,
                max_tokens=150
            )
            
            ai_text = response.choices[0].message.content
            chat_history.append({"role": "assistant", "content": ai_text})
            
            print(f"AI response: {ai_text}")
            
            # Send response back to frontend for TTS
            await websocket.send_json({"type": "ai_response", "text": ai_text})
            
    except WebSocketDisconnect:
        print("Client disconnected")
    except Exception as e:
        print(f"WebSocket error: {e}")

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
    return {"status": "Project Newton Backend is running (Free Web Speech Version)."}
