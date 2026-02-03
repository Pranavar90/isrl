import pandas as pd
import numpy as np

class FeatureEngineer:
    def __init__(self, user_context):
        self.user_context = user_context
        self.feature_cols = [
            'device_trust_score', 
            'failed_attempts_last_15min', 
            'hour_deviation', 
            'location_distance_km', 
            'ip_category_encoded', 
            'is_odd_hour_numeric', 
            'baseline_confidence',
            'dept_id',
            'user_type_id',
            'device_type_id'
        ]

    def engineer_features(self, auth_df):
        """Prepare features for ML training from the scaled auth dataset."""
        df = auth_df.copy()
        
        # Factorize categorical features for numerical consumption
        df['dept_id'] = df['department'].factorize()[0]
        df['user_type_id'] = df['user_type'].factorize()[0]
        df['device_type_id'] = df['device_type'].factorize()[0]
        
        features = df[self.feature_cols].copy()
        return features.fillna(0)

    def get_user_day_vector(self, event):
        """Extract a single feature vector for an incoming event (Inference)."""
        # Mapping known types for consistent inference
        dept_map = {'Finance': 0, 'HR': 1, 'Sales': 2, 'Database Mgmt': 3, 'Customer Support': 4, 
                    'IT': 5, 'Legal': 6, 'Marketing': 7, 'Engineering': 8, 'Security': 9}
        type_map = {'Admin': 0, 'Privileged': 1, 'Standard': 2}
        dev_map = {'Corporate_Laptop': 0, 'Personal_Laptop': 1, 'Mobile_Device': 2, 'Server': 3}

        vector = [
            event.get('device_trust_score', 50),
            event.get('failed_attempts_last_15min', 0),
            event.get('hour_deviation', 0),
            event.get('location_distance_km', 0),
            event.get('ip_category_encoded', 0),
            event.get('is_odd_hour_numeric', 0),
            event.get('baseline_confidence', 1),
            dept_map.get(event.get('department'), 0),
            type_map.get(event.get('user_type'), 2),
            dev_map.get(event.get('device_type'), 0)
        ]
        
        return np.array([vector])
