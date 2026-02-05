
import sys
import os
import joblib
import pandas as pd
import time

# Setup paths
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data_processor')))
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'ml_engine')))

from loader import DataProcessor
from scorer import HybridScorer
from feature_engineer import FeatureEngineer

def train():
    print("="*60)
    print("STARTING FULL MODEL TRAINING PIPELINE")
    print("="*60)
    
    base_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
    data_path = os.path.join(base_dir, "data")
    models_dir = os.path.join(base_dir, "models")
    os.makedirs(models_dir, exist_ok=True)
    
    # 1. Load Data
    print(f"Loading data from {data_path}...")
    processor = DataProcessor(data_path)
    processor.load_ldap() # Critical: Load user context first
    df = processor.load_auth_logs()
    print(f"Loaded {len(df)} events.")
    
    # 2. Engineer Features
    print("Engineering features...")
    user_context = processor.user_context
    engineer = FeatureEngineer(user_context)
    
    # Process in chunks to avoid memory issues if large
    features = []
    
    # For training, we can process a representative sample if 1M is too slow
    # But let's try full dataset first or a large sample
    sample_size = min(len(df), 200000) # Train on 200k events for speed/stability
    print(f"Training on {sample_size} sample events...")
    
    training_df = df.sample(n=sample_size, random_state=42)
    
    start_time = time.time()
    feature_vectors = []
    
    # Batch processing for feature engineering
    for _, row in training_df.iterrows():
        vec = engineer.get_user_day_vector(row.to_dict())
        feature_vectors.append(vec[0])
        
    import numpy as np
    X = np.array(feature_vectors)
    print(f"Feature matrix shape: {X.shape}")
    print(f"Feature engineering took {time.time() - start_time:.2f}s")
    
    # 3. Train Hybrid Scorer
    print("Initializing Hybrid Scorer...")
    scorer = HybridScorer(user_context, config={"use_gpu": True, "n_estimators": 200})
    
    # Train
    scorer.train_ml_engine(pd.DataFrame(X, columns=engineer.feature_cols), raw_df=training_df)
    
    # 4. Save Models
    print("Saving models...")
    joblib.dump(scorer.ml_model, os.path.join(models_dir, "isolation_forest.joblib"))
    joblib.dump(scorer.G, os.path.join(models_dir, "knowledge_graph.joblib"))
    joblib.dump(user_context, os.path.join(models_dir, "user_context.joblib"))
    
    # Save Autoencoder state
    import torch
    torch.save({
        'state_dict': scorer.ae_model.state_dict(),
        'mean': scorer.ae_model.mean,
        'std': scorer.ae_model.std,
        'threshold': scorer.ae_model.threshold
    }, os.path.join(models_dir, "autoencoder.pth"))
    
    print("="*60)
    print("TRAINING COMPLETE. ALL MODELS SAVED.")
    print("="*60)

if __name__ == "__main__":
    train()
