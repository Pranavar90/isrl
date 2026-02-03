import pandas as pd
import numpy as np
from sklearn.ensemble import IsolationForest
import shap
import json

class HybridScorer:
    def __init__(self, user_context):
        self.user_context = user_context
        self.ml_model = IsolationForest(contamination=0.01, random_state=42)
        self.explainer = None
        self.trained_features = []
        # Weights
        self.rule_weight = 0.4
        self.ml_weight = 0.6

    def calculate_impossible_travel(self, user_events):
        """Rule: Check distance/time between logons for a user."""
        # Mock logic: if time diff < 30 mins and PC_ID is different
        # In a real scenario, we'd map PC_ID to location.
        # For now, we'll flag different PC_ID within 10 mins as high risk.
        score = 0
        user_events = user_events.sort_values('date')
        for i in range(1, len(user_events)):
            prev = user_events.iloc[i-1]
            curr = user_events.iloc[i]
            time_diff = (curr['date'] - prev['date']).total_seconds() / 60
            if prev['pc'] != curr['pc'] and time_diff < 10:
                score = 100
                break
        return score

    def calculate_ldap_mismatch(self, event):
        """Rule: Flag access outside department's standard profile."""
        user_id = event.get('user')
        dept = self.user_context.get(user_id, {}).get('department', 'Unknown')
        
        # Simple heuristic: Certain depts shouldn't access certain resources/PCs
        # This would usually be a lookup table of 'Standard Profiles'
        score = 0
        # Example: Mock check
        if dept == "HR" and "ENG" in event.get('pc', ''):
            score = 80
        return score

    def train_ml_engine(self, training_data):
        """Train Isolation Forest on 'normal' behavior features."""
        # training_data should be pre-engineered features per user/day
        self.trained_features = training_data.columns.tolist()
        self.ml_model.fit(training_data)
        self.explainer = shap.TreeExplainer(self.ml_model)
        print("ML Engine trained.")

    def get_ml_score(self, feature_vector):
        """Get anomaly score from Isolation Forest (scaled 0-100)."""
        # score_samples returns negative of the anomaly score (lower is more anomalous)
        raw_score = self.ml_model.score_samples(feature_vector)[0]
        # Map raw_score (typ -0.5 to 0) to 0-100
        # Normal is around -0.4, anomalous is around -0.7
        normalized_score = np.clip((0.5 + raw_score) * 200, 0, 100)
        return 100 - normalized_score

    def get_unified_score(self, event, feature_vector, user_events):
        """Calculate final risk score (0-100)."""
        rule_score_travel = self.calculate_impossible_travel(user_events)
        rule_score_ldap = self.calculate_ldap_mismatch(event)
        rule_score = max(rule_score_travel, rule_score_ldap)
        
        ml_score = self.get_ml_score(feature_vector)
        
        final_score = (rule_score * self.rule_weight) + (ml_score * self.ml_weight)
        
        explanation = None
        if final_score > 75:
            explanation = self.generate_xai_summary(feature_vector, rule_score_travel, rule_score_ldap)
            
        return {
            "score": round(final_score, 2),
            "rule_score": rule_score,
            "ml_score": ml_score,
            "explanation": explanation
        }

    def generate_xai_summary(self, feature_vector, travel_rule, ldap_rule):
        """Generate SHAP explanation and NL summary."""
        shap_values = self.explainer.shap_values(feature_vector)
        # Get top 2 features
        top_indices = np.argsort(np.abs(shap_values[0]))[-2:]
        top_features = [self.trained_features[i] for i in top_indices]
        
        summary = f"HIGH RISK: "
        if travel_rule > 0:
            summary += "Impossible travel detected. "
        if ldap_rule > 0:
            summary += "LDAP profile mismatch. "
        
        summary += f"ML features flagged: {', '.join(top_features)}."
        
        return {
            "summary": summary,
            "shap_values": shap_values[0].tolist(),
            "features": self.trained_features
        }
