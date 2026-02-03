import pandas as pd
import os
import glob
from datetime import datetime

class DataProcessor:
    def __init__(self, raw_data_path):
        # Handle the extra r4.2 level if present
        self.raw_path = raw_data_path
        if os.path.exists(os.path.join(raw_data_path, "r4.2")):
            self.raw_path = os.path.join(raw_data_path, "r4.2")
        
        self.ldap_df = None
        self.user_context = {}

    def load_ldap(self):
        """Parse LDAP CSVs to build user peer group (Department/Role) context."""
        ldap_path = os.path.join(self.raw_path, "LDAP") # Capitalized in some versions
        if not os.path.exists(ldap_path):
            ldap_path = os.path.join(self.raw_path, "ldap")
            
        ldap_files = glob.glob(os.path.join(ldap_path, "*.csv"))
        if not ldap_files:
            print("No LDAP files found.")
            return

        # Load all LDAP records; usually they represent snapshots. 
        # We'll take the most recent record for each user for current context.
        all_ldap = []
        for f in ldap_files:
            df = pd.read_csv(f)
            all_ldap.append(df)
            
        if all_ldap:
            self.ldap_df = pd.concat(all_ldap).drop_duplicates(subset=['employee_name'], keep='last')
            # Create a lookup: user_id -> {dept, role, team}
            # Note: CERT r4.2 user IDs are often in the format 'ABC0123'
            # The column names might vary, usually 'user_id' or 'employee_name'
            # Let's assume standard CERT r4.2 format
            for _, row in self.ldap_df.iterrows():
                uid = row.get('user_id')
                if uid:
                    self.user_context[uid] = {
                        'department': row.get('department'),
                        'role': row.get('role'),
                        'business_unit': row.get('business_unit')
                    }
        print(f"Loaded context for {len(self.user_context)} users.")

    def load_logons(self):
        """Load logon.csv."""
        logon_path = os.path.join(self.raw_path, "logon.csv")
        if os.path.exists(logon_path):
            return pd.read_csv(logon_path, parse_dates=['date'])
        return pd.DataFrame()

    def load_file_events(self):
        """Load file.csv."""
        file_path = os.path.join(self.raw_path, "file.csv")
        if os.path.exists(file_path):
            return pd.read_csv(file_path, parse_dates=['date'])
        return pd.DataFrame()

    def get_user_peer_group(self, user_id):
        """Get the department/role for a user."""
        return self.user_context.get(user_id, {"department": "Unknown", "role": "Unknown"})

if __name__ == "__main__":
    # Test loading
    processor = DataProcessor("backend/data/raw")
    # processor.load_ldap() # Uncomment when data is ready
