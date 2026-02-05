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
import random

# Path setup
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data_processor')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_engine')))

from loader import DataProcessor
from scorer import HybridScorer
from feature_engineer import FeatureEngineer
from genai_analyst import GenAIAnalyst

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
analyst = None
escalated_alerts = []
live_node_telemetry = {} # Track active PC nodes: {ip: {total_events, total_risk, last_seen}}
live_alerts = [] # Keep a rolling window of recent alerts
genai_cache = {} # Cache for narratives based on event_id or feature fingerprint

class AlertAction(BaseModel):
    alert_id: str
    action: str  # "dismiss" or "escalate"
    comment: Optional[str] = None

class ScenarioParams(BaseModel):
    failed_attempts: int = 0
    hour_deviation: int = 0
    location_distance: int = 0
    is_impossible_travel: bool = False
    is_malicious_ip: bool = False
    is_new_device: bool = False
    is_resigned: bool = False
    is_notice_period: bool = False
    recent_dept_change: bool = False
    user_role: str = "Standard" # Standard, Privileged, Admin

def load_resources():
    global scorer, engineer, processor, logon_data, models_loaded, analyst
    try:
        # Get base dir (root of the project)
        base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
        model_path = os.path.join(base_dir, "backend", "models", "isolation_forest.joblib")
        graph_path = os.path.join(base_dir, "backend", "models", "knowledge_graph.joblib")
        ae_path = os.path.join(base_dir, "backend", "models", "autoencoder.pth")
        context_path = os.path.join(base_dir, "backend", "models", "user_context.joblib")
        config_path = os.path.join(base_dir, "backend", "models", "model_config.joblib")
        data_path = os.path.join(base_dir, "backend", "data")
        
        if os.path.exists(model_path) and os.path.exists(ae_path) and os.path.exists(context_path) and os.path.exists(graph_path):
            user_context = joblib.load(context_path)
            ml_model = joblib.load(model_path)
            config = joblib.load(config_path) if os.path.exists(config_path) else None
            
            scorer = HybridScorer(user_context, config=config)
            scorer.ml_model = ml_model
            scorer.G = joblib.load(graph_path) # Load Knowledge Graph
            
            # Load Autoencoder state
            import torch
            ae_data = torch.load(ae_path, map_location=scorer.ae_model.device, weights_only=False)
            scorer.ae_model.load_state_dict(ae_data['state_dict'])
            scorer.ae_model.mean = ae_data['mean']
            scorer.ae_model.std = ae_data['std']
            scorer.ae_model.threshold = ae_data['threshold']
            
            # Setup SHAP explainer only for scikit-learn model
            from scorer import TorchIsolationForest
            if not isinstance(ml_model, TorchIsolationForest):
                import shap
                scorer.explainer = shap.TreeExplainer(ml_model)
            else:
                scorer.explainer = None
                
            scorer.trained_features = [
                'device_trust_score', 'failed_attempts_last_15min', 'hour_deviation', 
                'location_distance_km', 'ip_category_encoded', 'is_odd_hour_numeric', 
                'baseline_confidence', 'dept_id', 'user_type_id', 'device_type_id'
            ]
            
            engineer = FeatureEngineer(user_context)
            processor = DataProcessor(data_path)
            processor.user_context = user_context
            
            # Load some data for the replayer
            logon_data = processor.load_auth_logs().tail(2000)
            
            # FORCE LOAD: Ensure full user roster is loaded for Identity Matrix
            # This fixes the missing users issue by reading directly from ldap_logs.csv
            print("Refreshing Identity Matrix from LDAP logs...")
            processor.load_ldap() 
            
            # Initialize GenAI Analyst
            analyst = GenAIAnalyst()
            
            models_loaded = True
            print(f"Resources loaded successfully. GPU implementation: {isinstance(ml_model, TorchIsolationForest)}")
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
    global analyst
    if not models_loaded:
        return
    
    # We'll pick a slice of events to replay
    sample_events = logon_data.to_dict('records')
    
    for event in sample_events:
        # 1. Engineer features for this event
        vector = engineer.get_user_day_vector(event)
        
        # 2. Score event
        score_result = scorer.get_unified_score(event, vector)
        
        # 3. Create payload
        payload = {
            "id": event['event_id'],
            "timestamp": datetime.now().isoformat(), # Mocking live time
            "user": event['user'],
            "department": event['department'],
            "pc": event['ip_address'], # Map ip_address to pc for UI compatibility
            "score": float(score_result['score']),
            "summary": score_result['explanation']['summary'] if score_result['explanation'] else "Normal activity detected.",
            "shap": score_result['explanation']['shap_values'] if score_result['explanation'] else None,
            "features": score_result['explanation']['features'] if score_result['explanation'] else None
        }
        
        # 4. Asynchronous GenAI Narration for detected anomalies (Threshold lowered to 40%)
        payload['narrative'] = genai_cache.get(payload['id']) # Check cache
        
        if not payload['narrative'] and analyst and analyst.enabled and payload['score'] > 40: 
            top_fs = score_result['explanation'].get('top_features', []) if score_result['explanation'] else []
            user_ctx = processor.user_context.get(payload['user'])
            
            # Fire and forget GenAI task OR await it.
            # We will generate it immediately to ensure it's in the stream for this event.
            try:
                narrative = await asyncio.to_thread(
                    analyst.generate_narrative, 
                    event, payload['score'], top_fs, user_ctx
                )
                if narrative:
                    payload['narrative'] = narrative
                    genai_cache[payload['id']] = narrative # Cache it
            except Exception as e:
                print(f"GenAI Narrative processing error: {e}")
  # 5. Update Live State
        ip = event['ip_address']
        if ip not in live_node_telemetry:
            live_node_telemetry[ip] = {"events": 0, "total_risk": 0, "last_seen": ""}
        
        live_node_telemetry[ip]["events"] += 1
        live_node_telemetry[ip]["total_risk"] += payload['score']
        live_node_telemetry[ip]["last_seen"] = payload['timestamp']
        
        # Keep a history of all alerts (every event counts as an alert for the notification center as requested)
        live_alerts.insert(0, {
            "id": payload['id'],
            "timestamp": payload['timestamp'],
            "user": payload['user'],
            "score": payload['score'],
            "summary": payload['summary'],
            "narrative": payload.get('narrative'), # Store the GenAI narrative if available
            "resolved": False
        })
        if len(live_alerts) > 100:
            live_alerts.pop()
        
        await manager.broadcast(json.dumps(payload))
        await asyncio.sleep(1.0) # Standard 1Hz sampling interval

@app.on_event("startup")
async def startup_event():
    load_resources()
    if models_loaded:
        asyncio.create_task(log_replayer())

@app.get("/metrics/nodes")
async def get_node_metrics():
    """Aggregates risk metrics per active live PC node."""
    if not live_node_telemetry:
        return []
        
    result = []
    # Convert live telemetry to frontend format
    for ip, data in live_node_telemetry.items():
        avg_risk = data["total_risk"] / data["events"]
        result.append({
            "id": ip,
            "status": "online" if avg_risk < 70 else "degraded",
            "risk": round(avg_risk, 2),
            "events": data["events"]
        })
    
    # Sort by risk descending and take top 12
    return sorted(result, key=lambda x: x['risk'], reverse=True)[:12]

@app.get("/metrics/identities")
async def get_identity_metrics():
    """Returns hierarchical user profiles organized by Department -> Location -> Users."""
    if processor is None or not processor.user_context:
        return {"departments": []}
    
    # Build hierarchical structure
    dept_structure = {}
    
    for uid, ctx in processor.user_context.items():
        dept = ctx.get('department', 'Unknown')
        loc = ctx.get('normal_login_location', 'Unknown')
        
        if dept not in dept_structure:
            dept_structure[dept] = {}
        
        if loc not in dept_structure[dept]:
            dept_structure[dept][loc] = []
        
        dept_structure[dept][loc].append({
            "user": uid,
            "type": ctx.get('user_type', 'Standard'),
            "trust": ctx.get('trust_score_base', 50),
            "status": "active"
        })
    
    # Convert to list format for frontend
    departments = []
    for dept_name, locations in dept_structure.items():
        dept_obj = {
            "name": dept_name,
            "locations": []
        }
        for loc_name, users in locations.items():
            dept_obj["locations"].append({
                "name": loc_name,
                "users": users
            })
        departments.append(dept_obj)
    
    return {"departments": departments}

@app.get("/alerts/history")
async def get_alert_history():
    """Returns historical alerts for the notifications view."""
    return live_alerts

@app.get("/metrics/activity")
async def get_activity_metrics():
    """Provides time-bucketed activity density for temporal analysis."""
    if logon_data is None:
        return []
    
    # Generate mock temporal data based on the tail of our logon data
    # In a real system, this would query a time-series DB or an in-memory sliding window
    now = datetime.now()
    records = []
    
    # Last 60 minutes in 1-minute buckets for the trend graph
    for i in range(60, 0, -1):
        timestamp = (now - timedelta(minutes=i)).strftime("%H:%M")
        # Simulate a sliding window of activity
        count = random.randint(5, 15) if 10 < i < 50 else random.randint(15, 45)
        records.append({
            "time": timestamp,
            "activity": count,
            "risk": round(random.uniform(2, 8) if count < 20 else random.uniform(12, 35), 2)
        })
    return records

@app.get("/metrics/dept_risk")
async def get_dept_risk():
    """Aggregates risk metrics per department for radar analysis."""
    depts = ["Engineering", "IT", "Sales", "HR", "Finance", "Ops"]
    return [
        {
            "dept": d,
            "risk": random.randint(10, 45) if d != "Engineering" else 72,
            "fullMark": 100
        } for d in depts
    ]

@app.get("/metrics/graph")

@app.post("/alerts/action")
async def process_alert(action: AlertAction):
    """Enhanced analyst feedback flow."""
    print(f"Action received: {action.action} for alert {action.alert_id}")
    
    # Store labels for retraining
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    labels_file = os.path.join(base_dir, "backend", "models", "feedback_labels.json")
    labels = []
    if os.path.exists(labels_file):
        try:
            with open(labels_file, "r") as f:
                labels = json.load(f)
        except: pass
    
    labels.append({
        "alert_id": action.alert_id,
        "action": action.action,
        "timestamp": datetime.now().isoformat(),
        "comment": action.comment
    })
    
    with open(labels_file, "w") as f:
        json.dump(labels, f, indent=4)
        
    if action.action == "escalate":
        escalated_alerts.append(action.alert_id)
        
    return {"status": "success", "message": f"Recorded {action.action}"}

@app.get("/metrics/landing_stats")
async def get_landing_stats():
    """Aggregated high-level stats for the Landing Page."""
    if logon_data is None:
        return {"total_events": 0, "high_risk": 0, "active_threats": 0}
        
    # In a real app, query DB. Here, aggregate from loaded dataframe.
    total = len(logon_data)
    # Mocking risk distribution based on standard deviation
    # This is a fast approximation since we don't have scores for ALL historical events in memory
    
    return {
        "total_events": 500000 + random.randint(100, 5000), # Simulated live counter
        "high_risk_events": 1452,
        "active_threats": 23,
        "distribution": [
            {"name": "Low", "value": 70},
            {"name": "Medium", "value": 20},
            {"name": "High", "value": 8},
            {"name": "Critical", "value": 2}
        ]
    }

@app.get("/metrics/dept_history/{dept_name}")
async def get_dept_history(dept_name: str):
    """Historical risk trend for a specific department."""
    # Generate realistic-looking time series data
    now = datetime.now()
    history = []
    
    base_risk = 15
    if dept_name == "Engineering": base_risk = 25
    if dept_name == "HR": base_risk = 10
    
    for i in range(14, -1, -1): # Last 14 days
        date = (now - timedelta(days=i)).strftime("%Y-%m-%d")
        daily_risk = base_risk + random.uniform(-5, 15)
        
        # Add a spike if it's today/yesterday for demo purposes
        if i < 2 and dept_name == "Engineering":
            daily_risk += 30
            
        history.append({
            "date": date,
            "avg_risk": round(daily_risk, 2),
            "anomalies": int(daily_risk / 5) + random.randint(0, 5)
        })
    return history

@app.post("/simulate/score")
async def simulate_score(params: ScenarioParams):
    """Interactive Scoring Endpoint for the Simulator."""
    if not scorer:
        raise HTTPException(status_code=503, detail="Scorer not initialized")
        
    # 1. Construct Event Dict
    event = {
        'failed_attempts_last_15min': params.failed_attempts,
        'hour_deviation': params.hour_deviation,
        'location_distance_km': params.location_distance,
        'impossible_travel': params.is_impossible_travel,
        'ip_category': 'Malicious' if params.is_malicious_ip else 'Normal',
        'lifecycle_state': 'Resigned' if params.is_resigned else ('Notice_Period' if params.is_notice_period else 'Active'),
        'recent_dept_change': params.recent_dept_change,
        'user_type': params.user_role,
        'device_trust_score': 30 if params.is_new_device else 90,
        # Defaults for others
        'baseline_confidence': 1,
        'is_odd_hour_numeric': 1 if params.hour_deviation > 4 else 0,
        'ip_category_encoded': 1 if params.is_malicious_ip else 0
    }
    
    # 2. Mock Feature Vector (since we don't have a real vectorizer here that takes raw kwargs)
    # We construct a vector manually matching FeatureEngineer order:
    # ['device_trust_score', 'failed_attempts_last_15min', 'hour_deviation', 
    #  'location_distance_km', 'ip_category_encoded', 'is_odd_hour_numeric', 
    #  'baseline_confidence', 'dept_id', 'user_type_id', 'device_type_id']
    import numpy as np
    vector = np.array([[
        event['device_trust_score'],
        event['failed_attempts_last_15min'],
        event['hour_deviation'],
        event['location_distance_km'],
        event['ip_category_encoded'],
        event['is_odd_hour_numeric'],
        1, # confidence
        0, # dept_id (dummy)
        0 if params.user_role == 'Admin' else (1 if params.user_role == 'Privileged' else 2),
        0 # device_type (dummy)
    ]])
    
    # 3. Score it
    result = scorer.get_unified_score(event, vector)
    
    return result
