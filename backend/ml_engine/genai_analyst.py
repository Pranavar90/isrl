import requests
import json

class GenAIAnalyst:
    """Wrapper for Ollama to generate natural language security analysis."""
    
    def __init__(self, model="phi3:mini", base_url="http://localhost:11434"):
        self.model = model
        self.base_url = f"{base_url}/api/generate"
        self.enabled = self._check_connection()

    def _check_connection(self):
        """Check if Ollama is running and the model is available."""
        try:
            # Short timeout to not block startup
            response = requests.get(f"{self.base_url.replace('/generate', '/tags')}", timeout=2)
            if response.status_code == 200:
                models = [m['name'] for m in response.json().get('models', [])]
                if any(self.model in m for m in models):
                    print(f"GenAI Analyst: Connected to Ollama. Model '{self.model}' ready.")
                    return True
                else:
                    print(f"GenAI Analyst: Connected to Ollama, but model '{self.model}' not found. Run 'ollama pull {self.model}'.")
            return False
        except Exception:
            print("GenAI Analyst: Ollama not detected at localhost:11434. Local LLM narratives disabled.")
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
        Sometimes our behavioral model flags events as "Anomalous" (High Risk Score) even if they look "Normal" on the surface. This happens when the mathematical signature of the behavior deviates from the user's historical baseline (e.g., login at 3 AM is technically not a policy violation, but it's mathematically rare for this specific user).
        
        INSTRUCTIONS:
        1. Write a 2-sentence professional analysis.
        2. EXPLAIN WHY the SHAP features ({', '.join(top_features)}) caused the score to increase.
        3. If the score is between 40-70%, explain it as a "behavioral shift" or "novel detection" rather than a definite threat.
        4. Maintain a formal, enterprise-grade tone. Do not use placeholders.
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
            response = requests.post(self.base_url, json=payload, timeout=10)
            if response.status_code == 200:
                return response.json().get('response', '').strip()
        except Exception as e:
            print(f"GenAI Analyst narration failed: {e}")
        return None
