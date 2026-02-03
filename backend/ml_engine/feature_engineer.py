import pandas as pd
import numpy as np

class FeatureEngineer:
    def __init__(self, user_context):
        self.user_context = user_context

    def engineer_features(self, logon_df, file_df):
        """Build daily behavioral features per user."""
        # 1. Logon Frequency
        logon_df['date_only'] = logon_df['date'].dt.date
        user_daily_logon = logon_df.groupby(['user', 'date_only']).size().reset_index(name='logon_count')
        
        # 2. File Access Volume
        file_df['date_only'] = file_df['date'].dt.date
        user_daily_file = file_df.groupby(['user', 'date_only']).size().reset_index(name='file_count')
        
        # Merge features
        features = pd.merge(user_daily_logon, user_daily_file, on=['user', 'date_only'], how='outer').fillna(0)
        
        # 3. Resource Rarity
        # Calculate how often a specific PC or File is accessed across the whole org
        pc_counts = logon_df['pc'].value_counts(normalize=True).to_dict()
        logon_df['pc_rarity'] = logon_df['pc'].map(pc_counts)
        
        # Average pc rarity per user per day
        avg_pc_rarity = logon_df.groupby(['user', 'date_only'])['pc_rarity'].mean().reset_index(name='avg_pc_rarity')
        features = pd.merge(features, avg_pc_rarity, on=['user', 'date_only'], how='left').fillna(1.0) # 1.0 means common
        
        # Add departmental context (numeric encoding for ML)
        features['dept_id'] = features['user'].apply(lambda x: self.user_context.get(x, {}).get('department', 'Unknown'))
        features['dept_id'] = pd.factorize(features['dept_id'])[0]
        
        return features.drop(columns=['user', 'date_only'])

    def get_user_day_vector(self, user_id, date, logon_df, file_df):
        """Extract a single feature vector for a specific user-day."""
        # This would be used during inference
        day_logons = logon_df[(logon_df['user'] == user_id) & (logon_df['date'].dt.date == date.date())]
        day_files = file_df[(file_df['user'] == user_id) & (file_df['date'].dt.date == date.date())]
        
        logon_count = len(day_logons)
        file_count = len(day_files)
        
        pc_counts = logon_df['pc'].value_counts(normalize=True).to_dict()
        avg_pc_rarity = day_logons['pc'].map(pc_counts).mean() if not day_logons.empty else 1.0
        
        dept = self.user_context.get(user_id, {}).get('department', 'Unknown')
        # Simplified dept_id
        dept_id = 0 # In real scenario, use consistent mapping
        
        return np.array([[logon_count, file_count, avg_pc_rarity, dept_id]])
