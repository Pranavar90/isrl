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

class AlertAction(BaseModel):
    alert_id: str
    action: str  # "dismiss" or "escalate"
    comment: Optional[str] = None

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
        
        # 4. Asynchronous GenAI Narration for all detected anomalies
        if analyst and analyst.enabled and payload['score'] > 20: 
            top_fs = score_result['explanation'].get('top_features', []) if score_result['explanation'] else []
            user_ctx = processor.user_context.get(payload['user'])
            
            # Fire and forget GenAI task OR await it if we want it in the same message.
            # To speed up, we will only await for VERY HIGH risk.
            if payload['score'] > 85:
                narrative = await asyncio.to_thread(
                    analyst.generate_narrative, 
                    event, payload['score'], top_fs, user_ctx
                )
                if narrative:
                    payload['summary'] = narrative
            else:
                # For medium risk, don't wait - keep the stream fast
                pass
        
        await manager.broadcast(json.dumps(payload))
        await asyncio.sleep(0.1) # Replay delay (Faster Firehose)

@app.on_event("startup")
async def startup_event():
    load_resources()
    if models_loaded:
        asyncio.create_task(log_replayer())

@app.get("/metrics/nodes")
async def get_node_metrics():
    """Aggregates risk metrics per PC node."""
    if not models_loaded or logon_data is None:
        return []
    
    # Aggregate by ip_address (representing our nodes)
    nodes = logon_data.groupby('ip_address').agg({
        'device_trust_score': 'mean',
        'failed_attempts_last_15min': 'sum'
    }).reset_index()
    
    # Mock some risk calculation based on stats
    result = []
    for _, row in nodes.tail(12).iterrows():
        trust = row['device_trust_score']
        failed = row['failed_attempts_last_15min']
        risk = max(0, min(100, (100 - trust) + (failed * 5)))
        result.append({
            "id": row['ip_address'],
            "status": "online" if risk < 70 else "degraded",
            "risk": round(risk, 2),
            "events": random.randint(50, 200)
        })
    return result

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
    if logon_data is None:
        return []
    
    # Just take some events and mock scores for history
    history = []
    sample = logon_data.tail(50).to_dict('records')
    for i, event in enumerate(sample):
        if i % 5 == 0: # Mocking some high risk events
            history.append({
                "id": event['event_id'],
                "timestamp": (datetime.now() - timedelta(minutes=i*10)).isoformat(),
                "user": event['user'],
                "score": random.randint(65, 95),
                "summary": "Suspicious behavioral pattern detected: login from sensitive node.",
                "resolved": False
            })
    return history

@app.get("/metrics/graph")
async def get_graph_data():
    """Export the Knowledge Graph in JSON format for the force-directed view."""
    if not models_loaded or scorer is None or scorer.G is None:
        return {"nodes": [], "links": []}
    
    # Sample nodes/edges to avoid overwhelming the frontend
    # Filter for nodes with distance to critical incidents or just a sample
    sample_nodes = list(scorer.G.nodes())[:100] 
    subgraph = scorer.G.subgraph(sample_nodes)
    
    nodes = []
    for node in subgraph.nodes():
        node_type = "user" if "(" in str(node) else "resource"
        nodes.append({
            "id": node,
            "type": node_type,
            "val": 10 if node_type == "user" else 5
        })
    
    links = []
    for edge in subgraph.edges():
        links.append({
            "source": edge[0],
            "target": edge[1]
        })
        
    return {"nodes": nodes, "links": links}

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
