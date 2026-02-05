import requests
import json

class GenAIAnalyst:
    """Wrapper for Ollama to generate natural language security analysis."""
    
    def __init__(self, model="gemma3:1b", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = f"{base_url}/api"
        self.enabled = self._check_connection()

    def _check_connection(self):
        """Check if Ollama is running and the model is available. Pulls model if missing."""
        import subprocess
        import time

        def try_connect(target_url):
            try:
                # Test connection to the tags endpoint
                response = requests.get(f"{target_url}/tags", timeout=2)
                return response.status_code == 200
            except:
                return False

        # 1. Check if Ollama is already running (Manual start or previous background)
        if not try_connect(self.base_url):
            print(f"GenAI Analyst: [localhost] not responding. Attempting background service initialization...")
            try:
                # Start 'ollama serve' as a detached background process
                subprocess.Popen(["ollama", "serve"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, creationflags=subprocess.CREATE_NO_WINDOW if hasattr(subprocess, 'CREATE_NO_WINDOW') else 0)
                
                # Wait for boot-up with a polling loop
                for _ in range(5):
                    time.sleep(2)
                    if try_connect(self.base_url):
                        break
            except Exception as e:
                print(f"GenAI Analyst: System-level serve failed. ({e})")

        # 2. Final connection verify and model check
        try:
            if try_connect(self.base_url):
                response = requests.get(f"{self.base_url}/tags", timeout=2)
                models = [m['name'] for m in response.json().get('models', [])]
                
                if any(self.model in m for m in models):
                    print(f"GenAI Analyst: Model '{self.model}' verified and ready for inference.")
                    return True
                else:
                    print(f"GenAI Analyst: Model '{self.model}' not detected locally. Initiating Auto-Pull (815MB)...")
                    # Increased timeout for pulling over slower networks
                    pull_resp = requests.post(f"{self.base_url}/pull", json={"name": self.model, "stream": False}, timeout=600)
                    if pull_resp.status_code == 200:
                       print(f"GenAI Analyst: '{self.model}' pull sequence complete.")
                       return True
            else:
                print("GenAI Analyst: All connection attempts to [localhost:11434] exhausted. Narratives disabled.")
            return False
        except Exception as e:
            print(f"GenAI Analyst: Initialization fault: {e}")
            return False

    def generate_narrative(self, event, score, top_features, user_context=None):
        """Generate a human-readable summary of the anomaly, explaining SHAP factors."""
        if not self.enabled:
            return None

        prompt = f"""
        [EXPERT SECURITY ANALYST SYSTEM]
        You are an advanced SOC analyst interpreting hybrid AI/ML telemetry.
        
        ANOMALY REPORT:
        - Target User: {event.get('user', 'Unknown')}
        - Department: {user_context.get('department', 'Unknown') if user_context else 'Unknown'}
        - Risk Probability: {score}%
        - Mathematical Anomaly Triggers (SHAP Contributions): {', '.join(top_features)}
        - Source Node: {event.get('ip_address', event.get('pc', 'Unknown'))}
        
        SITUATIONAL CONTEXT:
        Sometimes our behavioral model flags events as "Anomalous" (High Risk Score) even if they look "Normal" on the surface. This happens when the mathematical signature of the behavior deviates from the user's historical baseline.
        
        INSTRUCTIONS:
        1. Write a 2-sentence professional analysis.
        2. EXPLAIN WHY the SHAP features ({', '.join(top_features)}) caused the score to increase.
        3. Maintain a formal, enterprise-grade tone. Do not use placeholders.
        """

        try:
            payload = {
                "model": self.model,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.3,
                    "num_predict": 100
                }
            }
            # Use /generate endpoint explicitly
            response = requests.post(f"{self.base_url}/generate", json=payload, timeout=10)
            if response.status_code == 200:
                return response.json().get('response', '').strip()
        except Exception as e:
            print(f"GenAI Analyst narration failed: {e}")
        return None
