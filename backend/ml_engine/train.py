import sys
import os

# Add relevant directories to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'data_processor')))
sys.path.append(os.path.abspath(os.path.dirname(__file__)))

import pandas as pd
import joblib
from loader import DataProcessor 
from feature_engineer import FeatureEngineer
from scorer import HybridScorer

def train():
    raw_path = os.path.abspath("backend/data/raw")
    print(f"Loading data from {raw_path}...")
    
    processor = DataProcessor(raw_path)
    processor.load_ldap()
    
    print("Loading logons...")
    logon_df = processor.load_logons()
    print("Loading files...")
    # Loading full file.csv might be slow, let's take a sample if needed, 
    # but the user said "get the entire dataset... Train it on the gpu"
    file_df = processor.load_file_events()
    
    print("Engineering features...")
    engineer = FeatureEngineer(processor.user_context)
    
    # Train on first 6 months (Normal data)
    # The date range in CERT r4.2 starts around 2010-01-01
    split_date = pd.to_datetime("2010-06-01")
    training_logons = logon_df[logon_df['date'] < split_date]
    training_files = file_df[file_df['date'] < split_date]
    
    train_features = engineer.engineer_features(training_logons, training_files)
    
    print(f"Training ML Engine on {len(train_features)} samples...")
    scorer = HybridScorer(processor.user_context)
    scorer.train_ml_engine(train_features)
    
    # Save the model and processor context
    model_dir = "backend/models"
    if not os.path.exists(model_dir):
        os.makedirs(model_dir)
        
    joblib.dump(scorer.ml_model, os.path.join(model_dir, "isolation_forest.joblib"))
    joblib.dump(processor.user_context, os.path.join(model_dir, "user_context.joblib"))
    print("Training complete and models saved.")

if __name__ == "__main__":
    train()
