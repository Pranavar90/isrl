import sys
import os
import joblib
import pandas as pd
import torch
import argparse

# Add relevant directories to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data_processor')))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

from loader import DataProcessor 
from feature_engineer import FeatureEngineer
from scorer import HybridScorer

def get_manual_params():
    """Interactively get hyperparameters from the user."""
    print("\n--- Manual Model Configuration ---")
    try:
        n_estimators = input("Enter n_estimators [default 300]: ")
        n_estimators = int(n_estimators) if n_estimators else 300
        
        contamination = input("Enter contamination (0.001 to 0.5) [default 0.01]: ")
        contamination = float(contamination) if contamination else 0.01
        
        max_samples = input("Enter max_samples (int or 'auto') [default 'auto']: ")
        if max_samples and max_samples != 'auto':
            max_samples = int(max_samples)
        else:
            max_samples = 'auto'
            
        random_state = input("Enter random_state [default 42]: ")
        random_state = int(random_state) if random_state else 42
        
        use_gpu = input("Use GPU for training? (y/n) [default n]: ").lower() == 'y'
        
        return {
            "n_estimators": n_estimators,
            "contamination": contamination,
            "max_samples": max_samples,
            "random_state": random_state,
            "use_gpu": use_gpu
        }
    except ValueError as e:
        print(f"Invalid input: {e}. Using defaults.")
        return None

def train(params=None):
    # Set default data path relative to script
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), '..'))
    data_path = os.path.join(base_dir, "data")
    
    print(f"Loading data from {data_path}...")
    
    processor = DataProcessor(data_path)
    processor.load_ldap()
    
    print("Loading authentication logs...")
    auth_df = processor.load_auth_logs()
    
    if auth_df.empty:
        print("Error: auth_logs.csv is empty or not found.")
        return

    print(f"Engineering features for {len(auth_df)} events...")
    engineer = FeatureEngineer(processor.user_context)
    train_features = engineer.engineer_features(auth_df)
    
    if params:
        print(f"Training with custom parameters: {params}")
    else:
        print("Training with default parameters...")
        
    scorer = HybridScorer(processor.user_context, config=params)
    
    print(f"Training ML Engine on {len(train_features)} samples...")
    scorer.train_ml_engine(train_features, raw_df=auth_df)
    
    # Save the model and processor context
    model_dir = os.path.join(base_dir, "models")
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        
    joblib.dump(scorer.ml_model, os.path.join(model_dir, "isolation_forest.joblib"))
    joblib.dump(scorer.G, os.path.join(model_dir, "knowledge_graph.joblib"))
    
    # Save Autoencoder (PyTorch State Dict + Metadata)
    torch.save({
        'state_dict': scorer.ae_model.state_dict(),
        'mean': scorer.ae_model.mean,
        'std': scorer.ae_model.std,
        'threshold': scorer.ae_model.threshold,
        'input_dim': 10
    }, os.path.join(model_dir, "autoencoder.pth"))
    
    joblib.dump(processor.user_context, os.path.join(model_dir, "user_context.joblib"))
    
    # Save config for reference
    if params:
        joblib.dump(params, os.path.join(model_dir, "model_config.joblib"))
        
    # Unsupervised Validation Metrics
    print("\n--- Model Validation Metrics ---")
    if not params.get("use_gpu"):
        try:
            from sklearn.metrics import silhouette_score
            # Sample for silhouette calculation as it's O(N^2)
            sample_size = min(5000, len(train_features))
            sample = train_features.sample(sample_size)
            labels = scorer.ml_model.predict(sample)
            score = silhouette_score(sample, labels)
            print(f"Isolation Forest Silhouette Score (N={sample_size}): {score:.4f}")
        except Exception as e:
            print(f"Metrics error: {e}")

    ae_losses = scorer.ae_model.score_samples(train_features)
    print(f"Autoencoder Mean Reconstruction Loss: {ae_losses.mean():.6f}")
    print(f"Autoencoder Loss Std Dev: {ae_losses.std():.6f}")

    # Visualize one tree
    scorer.visualize_tree(os.path.join(model_dir, "tree_vis.png"))

    print(f"Training complete. Models and visualizations saved in {model_dir}")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Train Isolation Forest for Insider Threat Detection")
    parser.add_argument("--interactive", action="store_true", help="Manually enter hyperparameters")
    parser.add_argument("--n_estimators", type=int, default=300)
    parser.add_argument("--contamination", type=float, default=0.01)
    parser.add_argument("--max_samples", default='auto')
    parser.add_argument("--random_state", type=int, default=42)
    parser.add_argument("--gpu", action="store_true", help="Enable GPU training")
    
    args = parser.parse_args()
    
    if args.interactive:
        params = get_manual_params()
    else:
        # Handle 'auto' for max_samples
        max_s = args.max_samples
        if max_s.isdigit():
            max_s = int(max_s)
            
        params = {
            "n_estimators": args.n_estimators,
            "contamination": args.contamination,
            "max_samples": max_s,
            "random_state": args.random_state,
            "use_gpu": args.gpu
        }
        
    train(params)
