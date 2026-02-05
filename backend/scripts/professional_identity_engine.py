import pandas as pd
import numpy as np
import random
import os
import time
import uuid
from datetime import datetime, timedelta
import hashlib
from concurrent.futures import ProcessPoolExecutor

# Configuration
TOTAL_USERS = 5000
TOTAL_EVENTS = 500000
DATA_DIR = "backend/data"

DEPARTMENTS = ['Finance', 'HR', 'Sales', 'Database Mgmt', 'Customer Support', 'IT', 'Legal', 'Marketing', 'Engineering', 'Security']
USER_TYPES = ['Standard', 'Privileged', 'Admin']
LOCATIONS = ['New York', 'London', 'Tokyo', 'Singapore', 'Berlin', 'Paris', 'Sydney', 'Mumbai', 'Dubai', 'San Francisco']
DEVICES = ['Corporate_Laptop', 'Personal_Laptop', 'Mobile_Device', 'Server']

def generate_user_profile(user_id):
    """Generate a realistic persistent behavior profile."""
    first_names = ["Aarav", "Aditi", "Ethan", "Isabella", "Chen", "Mei", "Liam", "Sophia", "Lucas", "Mia"]
    last_names = ["Kumar", "Sharma", "Smith", "Jones", "Gupta", "Wong", "Chen", "Patel", "Garcia", "Jain"]
    
    first = random.choice(first_names)
    last = random.choice(last_names)
    raw_name = f"{first} {last}"
    # DPDP-ready Pseudo ID
    pseudo_id = hashlib.sha256(f"{raw_name}{user_id}".encode()).hexdigest()[:12]
    # Display name for evaluation: "Hash (Name)"
    display_name = f"{pseudo_id} ({raw_name})"
    
    dept = random.choice(DEPARTMENTS)
    u_type = random.choice(USER_TYPES)
    
    # Behavioral Baseline
    primary_loc = random.choice(LOCATIONS)
    work_hour_start = random.randint(7, 10) # 7 AM to 10 AM
    work_duration = random.randint(7, 10)   # 7 to 10 hours
    
    return {
        'user': display_name,
        'department': dept,
        'user_type': u_type,
        'normal_login_location': primary_loc,
        'normal_hour_start': work_hour_start,
        'normal_hour_end': (work_hour_start + work_duration) % 24,
        'trust_score_base': random.randint(60, 95)
    }

def generate_event(user_profile, timestamp):
    """Generate a single authentication event based on user profile."""
    event_type = "NORMAL"
    
    # 1. Determine Location
    loc = user_profile['normal_login_location']
    if random.random() < 0.05: # 5% chance of travel
        loc = random.choice([l for l in LOCATIONS if l != loc])
        
    # 2. Determine Device and Trust
    device = random.choice(DEVICES)
    trust_score = user_profile['trust_score_base']
    if device != 'Corporate_Laptop':
        trust_score -= random.randint(10, 30)
    
    # 3. Time Deviations
    hour = timestamp.hour
    is_odd_hour = 1 if (hour < user_profile['normal_hour_start'] or hour > user_profile['normal_hour_end']) else 0
    
    # 4. Attack Injection (1.5% chance)
    anomaly_type = None
    if random.random() < 0.015:
        attack_type = random.choice(['IMP_TRAVEL', 'MALICIOUS_IP', 'BRUTE_FORCE', 'DATA_EXFIL'])
        if attack_type == 'IMP_TRAVEL':
            loc = "Injected_Anomaly_Location"
            anomaly_type = "Impossible Travel"
        elif attack_type == 'MALICIOUS_IP':
            loc = "Blacklisted_IP_Range"
            anomaly_type = "Malicious IP Connection"
        elif attack_type == 'BRUTE_FORCE':
            trust_score = 10
            anomaly_type = "Brute Force Attempt"
        elif attack_type == 'DATA_EXFIL':
            is_odd_hour = 1
            anomaly_type = "Unusual Data Access Pattern"

    return {
        'event_id': f"evt_{uuid.uuid4().hex[:8]}",
        'timestamp': timestamp.isoformat(),
        'user': user_profile['user'],
        'department': user_profile['department'],
        'user_type': user_profile['user_type'],
        'ip_address': f"192.168.{random.randint(1, 254)}.{random.randint(1, 254)}",
        'location': loc,
        'device_type': device,
        'device_trust_score': max(0, min(100, trust_score)),
        'failed_attempts_last_15min': random.randint(0, 2) if anomaly_type != "Brute Force Attempt" else random.randint(10, 50),
        'hour_deviation': 5 if is_odd_hour else 0,
        'location_distance_km': 5000 if anomaly_type == "Impossible Travel" else 0,
        'ip_category_encoded': 2 if anomaly_type == "Malicious IP Connection" else 0,
        'is_odd_hour_numeric': is_odd_hour,
        'baseline_confidence': 1.0,
        'anomaly_type': anomaly_type
    }

def main():
    print(f"Professional Identity Engine: Generating {TOTAL_USERS} persistent profiles...")
    profiles = [generate_user_profile(i) for i in range(TOTAL_USERS)]
    
    # Save LDAP sync
    ldap_df = pd.DataFrame(profiles)
    ldap_df.to_csv(os.path.join(DATA_DIR, "ldap_logs.csv"), index=False)
    print(f"LDAP directory saved with 5,000 unique identities.")

    start_date = datetime.now() - timedelta(days=30)
    events = []
    
    print(f"Simulating {TOTAL_EVENTS} events over 30 days...")
    for i in range(TOTAL_EVENTS):
        # Weighted random user (some users log in more than others)
        user_idx = int(np.random.power(0.5) * TOTAL_USERS)
        
        # Advance time slightly for each event
        event_time = start_date + timedelta(seconds=i * (30*24*3600 / TOTAL_EVENTS))
        
        events.append(generate_event(profiles[user_idx], event_time))
        
        if (i+1) % 100000 == 0:
            print(f"Progress: {i+1} events generated...")

    auth_df = pd.DataFrame(events)
    auth_df.to_csv(os.path.join(DATA_DIR, "auth_logs.csv"), index=False)
    print(f"Professional telemetry saved to {os.path.join(DATA_DIR, 'auth_logs.csv')}")

if __name__ == "__main__":
    if not os.path.exists(DATA_DIR):
        os.makedirs(DATA_DIR)
    main()
