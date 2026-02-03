import pandas as pd
import os

class DataProcessor:
    def __init__(self, data_path="backend/data"):
        self.data_path = data_path
        self.user_context = {}

    def load_ldap(self):
        """Parse the new ldap_logs.csv to build user context."""
        ldap_path = os.path.join(self.data_path, "ldap_logs.csv")
        if not os.path.exists(ldap_path):
            print(f"LDAP file not found at {ldap_path}")
            return

        df = pd.read_csv(ldap_path)
        for _, row in df.iterrows():
            uid = row.get('user')
            if uid:
                self.user_context[uid] = {
                    'department': row.get('department'),
                    'user_type': row.get('user_type'),
                    'normal_login_location': row.get('normal_login_location'),
                    'normal_hour': row.get('normal_hour'),
                    'trust_score_base': row.get('trust_score_base')
                }
        print(f"Loaded context for {len(self.user_context)} users.")

    def load_auth_logs(self):
        """Load the new auth_logs.csv."""
        auth_path = os.path.join(self.data_path, "auth_logs.csv")
        if os.path.exists(auth_path):
            return pd.read_csv(auth_path)
        print(f"Auth logs not found at {auth_path}")
        return pd.DataFrame()

    def get_user_peer_group(self, user_id):
        """Get the department/role for a user."""
        return self.user_context.get(user_id, {"department": "Unknown", "user_type": "Standard"})

if __name__ == "__main__":
    processor = DataProcessor()
    processor.load_ldap()
    df = processor.load_auth_logs()
    print(f"Loaded {len(df)} auth events.")
