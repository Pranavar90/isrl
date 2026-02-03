import sys
import os
import asyncio
import json
import joblib
import pandas as pd
from datetime import datetime, timedelta
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional

# Path setup
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data_processor')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_engine')))

from loader import DataProcessor
from scorer import HybridScorer
from feature_engineer import FeatureEngineer

app = FastAPI(title="CERT Insider Threat Detection SOC")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global State
models_loaded = False
scorer = None
engineer = None
processor = None
logon_data = None
file_data = None
escalated_alerts = []

class AlertAction(BaseModel):
    alert_id: str
    action: str  # "dismiss" or "escalate"
    comment: Optional[str] = None

def load_resources():
    global scorer, engineer, processor, logon_data, file_data, models_loaded
    try:
        # Get base dir (root of the project)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        model_path = os.path.join(base_dir, "backend", "models", "isolation_forest.joblib")
        context_path = os.path.join(base_dir, "backend", "models", "user_context.joblib")
        raw_path = os.path.join(base_dir, "backend", "data", "raw")
        
        if os.path.exists(model_path) and os.path.exists(context_path):
            user_context = joblib.load(context_path)
            ml_model = joblib.load(model_path)
            
            scorer = HybridScorer(user_context)
            scorer.ml_model = ml_model
            # Setup SHAP explainer
            import shap
            scorer.explainer = shap.TreeExplainer(ml_model)
            scorer.trained_features = ['logon_count', 'file_count', 'avg_pc_rarity', 'dept_id']
            
            engineer = FeatureEngineer(user_context)
            processor = DataProcessor(raw_path)
            processor.user_context = user_context
            
            # Load some data for the replayer (last 1000 events)
            logon_data = processor.load_logons().tail(1000)
            file_data = processor.load_file_events().tail(5000)
            
            models_loaded = True
            print("Resources loaded successfully")
        else:
            print("Models not found. Please run training first.")
    except Exception as e:
        print(f"Error loading resources: {e}")

class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        self.active_connections.remove(websocket)

    async def broadcast(self, message: str):
        for connection in self.active_connections:
            await connection.send_text(message)

manager = ConnectionManager()

@app.websocket("/ws/stream")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)

async def log_replayer():
    """Replays events and scores them in real-time."""
    if not models_loaded:
        return
    
    # We'll pick a slice of events to replay
    sample_events = logon_data.to_dict('records')
    
    for event in sample_events:
        # 1. Engineer features for this user-day
        user_id = event['user']
        date = event['date']
        
        # Get feature vector
        vector = engineer.get_user_day_vector(user_id, date, logon_data, file_data)
        
        # 2. Score event
        score_result = scorer.get_unified_score(event, vector, logon_data[logon_data['user'] == user_id])
        
        # 3. Create payload
        payload = {
            "id": event['id'],
            "timestamp": event['date'].isoformat(),
            "user": event['user'],
            "pc": event['pc'],
            "score": score_result['score'],
            "summary": score_result['explanation']['summary'] if score_result['explanation'] else "Normal activity detected.",
            "shap": score_result['explanation']['shap_values'] if score_result['explanation'] else None,
            "features": score_result['explanation']['features'] if score_result['explanation'] else None
        }
        
        await manager.broadcast(json.dumps(payload))
        await asyncio.sleep(2) # Replay delay

@app.on_event("startup")
async def startup_event():
    load_resources()
    if models_loaded:
        asyncio.create_task(log_replayer())

@app.get("/health")
async def health():
    return {"status": "ok", "models_loaded": models_loaded}

@app.post("/alerts/action")
async def process_alert(action: AlertAction):
    print(f"Action received: {action.action} for alert {action.alert_id}")
    if action.action == "escalate":
        escalated_alerts.append(action.alert_id)
    return {"status": "success", "action": action.action}
