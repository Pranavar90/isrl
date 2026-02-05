import pandas as pd
import numpy as np
import networkx as nx
from sklearn.ensemble import IsolationForest
import shap
import torch
import torch.nn as nn
try:
    from autoencoder import BehavioralAutoencoder
except ImportError:
    import sys
    import os
    sys.path.append(os.path.dirname(__file__))
    from autoencoder import BehavioralAutoencoder

class TorchIsolationForest:
    """A PyTorch implementation of the Isolation Forest logic for GPU acceleration."""
    def __init__(self, n_estimators=100, max_samples='auto', contamination=0.01, random_state=42):
        self.n_estimators = n_estimators
        self.max_samples = max_samples
        self.contamination = contamination
        self.random_state = random_state
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        self.trees = []
        self.feature_importances_ = None

    def fit(self, X):
        if isinstance(X, pd.DataFrame):
            X = X.values
        
        X_torch = torch.tensor(X, dtype=torch.float32).to(self.device)
        n_samples, n_features = X_torch.shape
        
        if self.max_samples == 'auto':
            self.max_samples_val = min(256, n_samples)
        else:
            self.max_samples_val = self.max_samples

        torch.manual_seed(self.random_state)
        
        self.trees = []
        for _ in range(self.n_estimators):
            # Sample indices
            indices = torch.randperm(n_samples, device=self.device)[:self.max_samples_val]
            sample = X_torch[indices]
            
            tree = self._build_random_tree(sample)
            self.trees.append(tree)
            
        return self

    def _build_random_tree(self, data, depth=0, max_depth=10):
        if depth >= max_depth or data.shape[0] <= 1:
            return {"type": "leaf", "size": data.shape[0], "depth": depth}
        
        n_features = data.shape[1]
        feature_idx = torch.randint(0, n_features, (1,), device=self.device).item()
        
        min_val = data[:, feature_idx].min()
        max_val = data[:, feature_idx].max()
        
        if min_val == max_val:
            return {"type": "leaf", "size": data.shape[0], "depth": depth}
            
        # Ensure random value is on the same device
        split_val = (torch.rand(1, device=self.device) * (max_val - min_val) + min_val)
        
        left_mask = data[:, feature_idx] < split_val
        right_mask = ~left_mask
        
        # Guard against zero-sized splits
        if left_mask.sum() == 0 or right_mask.sum() == 0:
            return {"type": "leaf", "size": data.shape[0], "depth": depth}

        return {
            "type": "node",
            "feature": feature_idx,
            "split": split_val,
            "left": self._build_random_tree(data[left_mask], depth + 1, max_depth),
            "right": self._build_random_tree(data[right_mask], depth + 1, max_depth)
        }

    def score_samples(self, X):
        if isinstance(X, pd.DataFrame):
            X = X.values
        X_torch = torch.tensor(X, dtype=torch.float32).to(self.device)
        
        path_lengths = []
        for tree in self.trees:
            lengths = self._get_path_length(X_torch, tree)
            path_lengths.append(lengths)
            
        avg_path_length = torch.stack(path_lengths).mean(dim=0)
        
        scores = -1.0 * (avg_path_length / 10.0) # Approximation
        return scores.cpu().numpy()

    def _get_path_length(self, X, node):
        lengths = torch.zeros(X.shape[0], device=self.device)
        if node["type"] == "leaf":
            return lengths + node["depth"]
            
        feature_idx = node["feature"]
        split_val = node["split"]
        
        left_mask = X[:, feature_idx] < split_val
        right_mask = ~left_mask
        
        if left_mask.any():
            lengths[left_mask] = self._get_path_length(X[left_mask], node["left"])
        if right_mask.any():
            lengths[right_mask] = self._get_path_length(X[right_mask], node["right"])
            
        return lengths

class HybridScorer:
    def __init__(self, user_context, config=None):
        self.user_context = user_context
        self.config = config or {
            "n_estimators": 300,
            "contamination": 0.01,
            "max_samples": "auto",
            "random_state": 42,
            "use_gpu": False
        }
        
        if self.config.get("use_gpu") and torch.cuda.is_available():
            print("Using GPU-accelerated Isolation Forest (PyTorch)")
            self.ml_model = TorchIsolationForest(
                n_estimators=self.config.get("n_estimators", 100),
                contamination=self.config.get("contamination", 0.01),
                max_samples=self.config.get("max_samples", "auto"),
                random_state=self.config.get("random_state", 42)
            )
        else:
            self.ml_model = IsolationForest(
                n_estimators=self.config.get("n_estimators", 300),
                contamination=self.config.get("contamination", 0.01),
                max_samples=self.config.get("max_samples", "auto"),
                random_state=self.config.get("random_state", 42),
                n_jobs=-1 # Use all available cores
            )
            
        # Initialize Autoencoder behavioral engine
        input_dim = 10 # Matches the 10 features in FeatureEngineer
        self.ae_model = BehavioralAutoencoder(input_dim)
        
        # Initialize Knowledge Graph
        self.G = nx.Graph()
        
        self.ae_weight = 0.4
        self.if_weight = 0.2
        self.graph_weight = 0.1
        self.rule_weight = 0.3
        
        self.explainer = None
        self.trained_features = []

    def calculate_rules(self, event):
        """Check direct indicators from the event data."""
        score = 0
        if event.get('impossible_travel') is True or event.get('impossible_travel') == "True":
            score = max(score, 90)
        if event.get('ip_category') == 'Malicious':
            score = max(score, 85)
        if event.get('failed_attempts_last_15min', 0) > 5:
            score = max(score, 70)
        return score

    def train_ml_engine(self, training_data, raw_df=None):
        """Train Global (IF), Behavioral (AE), and Relational (Graph) models."""
        self.trained_features = training_data.columns.tolist()
        
        print("Training Global Isolation Forest...")
        self.ml_model.fit(training_data)
        
        print("Training Neural Behavioral Autoencoder...")
        self.ae_model.fit(training_data)
        
        if raw_df is not None:
            print("Building Knowledge Graph from history...")
            self.build_knowledge_graph(raw_df)

        if not isinstance(self.ml_model, TorchIsolationForest):
            self.explainer = shap.TreeExplainer(self.ml_model)
        else:
            self.explainer = None 
            
        print(f"UEBA Pipeline trained on {len(self.trained_features)} features.")

    def build_knowledge_graph(self, df):
        """Build relationships between users and entities."""
        self.G.clear()
        for _, row in df.iterrows():
            user = row['user']
            ip = row['ip_address']
            self.G.add_edge(user, ip)
        print(f"Knowledge Graph built with {self.G.number_of_nodes()} entities.")

    def get_graph_score(self, user, ip):
        """Calculate score based on graph connectivity (0-100)."""
        if not self.G.has_node(user):
            return 50 # Unknown user
            
        # If user has never connected to this IP, it's a relational anomaly
        if not self.G.has_edge(user, ip):
            # Check centrality of the IP
            if self.G.has_node(ip):
                ip_centrality = self.G.degree(ip)
                # If IP is highly central (like a common server), less risky
                risk = 80 if ip_centrality < 5 else 30
            else:
                risk = 100 # Totally new IP
            return risk
            
        return 0 # Existing relationship

    def get_ml_score(self, feature_vector):
        """Get anomaly score from Isolation Forest (scaled 0-100)."""
        # Convert to DataFrame to avoid sklearn feature names warning
        import pandas as pd
        feature_names = ['logon_count', 'file_count', 'pc_rarity', 'hour_deviation', 
                        'location_distance', 'failed_attempts', 'ip_category', 
                        'is_odd_hour', 'device_trust', 'baseline_confidence']
        
        if isinstance(feature_vector, np.ndarray):
            if len(feature_vector.shape) == 1:
                feature_vector = feature_vector.reshape(1, -1)
            feature_df = pd.DataFrame(feature_vector, columns=feature_names[:feature_vector.shape[1]])
        else:
            feature_df = feature_vector
            
        raw_score = self.ml_model.score_samples(feature_df)[0]
        # Normalize score based on model type
        if isinstance(self.ml_model, TorchIsolationForest):
            # Torch model scores are already negative approximations
            normalized_score = np.clip((1.0 + raw_score) * 100, 0, 100)
        else:
            normalized_score = np.clip((0.6 + raw_score) * 250, 0, 100)
            
        return 100 - normalized_score

    def get_unified_score(self, event, feature_vector):
        """Calculate final risk score (Ensemble logic)."""
        rule_score = self.calculate_rules(event)
        
        # 1. Isolation Forest Score (Global Outliers)
        if_raw = self.ml_model.score_samples(feature_vector)[0]
        if isinstance(self.ml_model, TorchIsolationForest):
            if_norm = np.clip((1.0 + if_raw) * 100, 0, 100)
        else:
            if_norm = np.clip((0.6 + if_raw) * 250, 0, 100)
        if_score = 100 - if_norm

        # 2. Autoencoder Score (User Behavioral Baseline)
        ae_raw = self.ae_model.score_samples(feature_vector)[0]
        ae_score = np.clip((ae_raw / (self.ae_model.threshold + 1e-9)) * 50, 0, 100)
        
        # 3. Graph Score (Relational Anomaly)
        user = event.get('user', 'Unknown')
        ip = event.get('ip_address', 'Unknown')
        graph_score = self.get_graph_score(user, ip)

        # Ensemble Calculation: Rules (30%) + IF (20%) + AE (40%) + Graph (10%)
        final_score = (rule_score * self.rule_weight) + \
                      (if_score * self.if_weight) + \
                      (ae_score * self.ae_weight) + \
                      (graph_score * self.graph_weight)
        
        explanation = None
        if final_score > 15: # Lowered threshold to ensure single-factor anomalies (like failed attempts) trigger summaries
            explanation = self.generate_xai_summary(feature_vector, rule_score, final_score, event, if_score, ae_score, graph_score)
             
        return {
            "score": round(final_score, 2),
            "rule_score": rule_score,
            "ml_score": round((if_score + ae_score)/2, 2), # Composite ML score for UI
            "explanation": explanation
        }

    def generate_xai_summary(self, feature_vector, rule_score, final_score=0, event=None, if_score=0, ae_score=0, graph_score=0):
        """Generate high-fidelity UEBA summary."""
        summary = ""
        if rule_score > 60:
            summary += "Critical: High-risk security rules triggered. "
        
        if graph_score > 70:
            summary += "Relational Anomaly: User connecting to an unfamiliar or isolated entity. "
        
        if ae_score > 70:
            summary += "Significant behavioral shift detected against user baseline. "
        elif if_score > 70:
            summary += "Global statistical outlier detected. "
        else:
            summary += "Monitoring minor behavioral variances. "

        # Get feature importance from the neural Autoencoder
        ae_importances = self.ae_model.get_feature_importance(feature_vector)[0]
        top_indices = np.argsort(ae_importances)[-3:][::-1]
        top_features = [self.trained_features[i] for i in top_indices]
        
        summary += f"Contribution focus: {', '.join(top_features)}."
        
        # Merge with SHAP if available
        shap_values = None
        if self.explainer:
            shap_values = self.explainer.shap_values(feature_vector)[0]
        
        return {
            "summary": summary,
            "shap_values": shap_values.tolist() if shap_values is not None else None,
            "ae_importances": ae_importances.tolist(),
            "features": self.trained_features,
            "top_features": top_features
        }
    
    def get_ml_score(self, feature_vector):
        # Deprecated in favor of ensemble get_unified_score
        return 0

    def visualize_tree(self, output_path="backend/models/tree_vis.png"):
        """Visualize a single decision tree from the forest."""
        if isinstance(self.ml_model, IsolationForest):
            try:
                import matplotlib.pyplot as plt
                from sklearn import tree
                import os
                
                # Create directory if not exists
                os.makedirs(os.path.dirname(output_path), exist_ok=True)
                
                # Select the first tree
                estimator = self.ml_model.estimators_[0]
                
                plt.figure(figsize=(24, 12))
                tree.plot_tree(estimator, 
                               feature_names=self.trained_features, 
                               max_depth=3, 
                               filled=True, 
                               rounded=True, 
                               fontsize=10)
                
                plt.title("Isolation Forest Decision Path (Top 3 Levels)")
                plt.savefig(output_path, dpi=300, bbox_inches='tight')
                plt.close()
                print(f"Tree visualization saved to {output_path}")
                return output_path
            except Exception as e:
                print(f"Failed to visualize tree: {e}")
                return None
        else:
            print("Tree visualization is only supported for CPU-based Isolation Forest.")
            return None
