# Sentinel UEBA: Multi-Model Insider Threat Detection PoC

Sentinel is a high-fidelity **User and Entity Behavior Analytics (UEBA)** platform designed to detect subtle insider threats within enterprise environments. It combines deep learning, statistical ensembles, and GenAI to turn raw telemetry into actionable narratives.

## 🧠 Architecture Overview

Sentinel uses a **Multi-Model Ensemble** to minimize false positives and maximize detection sensitivity:

1.  **Global Detection (Isolation Forest)**: A forest of 400 parallelized trees (CPU/GPU) that identifies statistical outliers across the entire organization.
2.  **Behavioral Baselining (Deep Autoencoder)**: A PyTorch-based neural engine that learns "normal" latent spaces for each user, flagging deviations from individual historical patterns.
3.  **Heuristic Rules**: A layer of deterministic security checks (e.g., Impossible Travel, Malicious IPs).
4.  **GenAI Narration (Phi-3:mini)**: A local LLM that synthesizes SHAP feature importance and neural gradients into professional security analyst briefings.

---

## 📊 Dataset Generation

The system operates on a synthetic dataset of **500,000 authentication events** mapped to **5,000 unique identities**.

### Generation Logic
The dataset was programmatically generated using a custom "Synthetic Identity" engine. Each user is assigned a "Normal" profile (Department, Working Hours, Trusted Device, Primary Location).

**The Anomaly Injection Logic follows this prompt-style specification:**
> "Generate a 500k event audit log where 90% of traffic is 'Pure Normal' (matching user-profile work hours and locations). Inject 10% anomalies based on three tiers:
> 1. **Tier 1 (Rules)**: High-impact indicators like 'Impossible Travel' (location jumps > 1000km/hr) and known Malicious IPs.
> 2. **Tier 2 (Global Outliers)**: Rare but non-malicious events like a standard user logging into a Server node.
> 3. **Tier 3 (Subtle Behavioral Shifts)**: Users logging in at 'Odd Hours' (12-hour shifts from their normal baseline) or from new devices with low trust scores."

### Key Files:
- `backend/scripts/generate_auth_data.py`: The identity and telemetry generator.
- `backend/data/ldap_logs.csv`: The simulated 5,000-user directory.
- `backend/data/auth_logs.csv`: The raw 500k event telemetry.

---

## 🚀 Getting Started

### Prerequisites:
- Python 3.10+
- Node.js & NPM
- **Ollama** (running `phi3:mini`)
- NVIDIA GPU with CUDA (Optional, for acceleration)

### Installation:
1. **Initialize Backend**:
   ```bash
   cd backend
   pip install -r requirements.txt # ensure pandas, torch, shap, sklearn, fastapi are installed
   ```
2. **Train the Models**:
   ```bash
   python ml_engine/train.py --n_estimators 400
   ```
3. **Start Services**:
   - Backend: `uvicorn api.main:app --host 0.0.0.0 --port 8000`
   - Frontend: `cd frontend && npm run dev`

---

## 🌲 Decision Transparency
Every training run exports a structural visualization of the Isolation Forest logic to `backend/models/tree_vis.png`, allowing analysts to inspect the "decision paths" of the global detection layer.

## 🛠️ Tech Stack
- **Frontend**: React, TailwindCSS, Recharts, Lucide
- **Backend**: FastAPI, PyTorch, Scikit-Learn
- **Explainability**: SHAP (Global), Gradient Attribution (Behavioral)
- **GenAI**: Local Phi-3 via Ollama
