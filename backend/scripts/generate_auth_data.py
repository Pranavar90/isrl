import pandas as pd
import numpy as np
import random
import multiprocessing as mp
import os
import time

# Configurations
TOTAL_EVENTS = 500000
TOTAL_EMPLOYEES = 5000
NUM_CORES = mp.cpu_count()
CHUNK_SIZE = TOTAL_EVENTS // NUM_CORES

# Data Pools
DEPARTMENTS = ['Finance', 'HR', 'Sales', 'Database Mgmt', 'Customer Support', 'IT', 'Legal', 'Marketing', 'Engineering', 'Security']
USER_TYPES = ['Admin', 'Privileged', 'Standard']
DEVICE_TYPES = ['Personal_Laptop', 'Corporate_Laptop', 'Mobile_Device', 'Server']
LOCATIONS = ['Bengaluru', 'Tokyo', 'Berlin', 'Sydney', 'New York', 'London', 'Paris', 'San Francisco', 'Singapore', 'Mumbai']
IP_CATEGORIES = ['Normal', 'Malicious']

FIRST_NAMES = ['Aarav', 'Sneha', 'Rajiv', 'Daniel', 'Nisha', 'Riya', 'Komal', 'Pranav', 'Anjali', 'Vikram', 
               'John', 'Emma', 'Liam', 'Olivia', 'Noah', 'Ava', 'Sophia', 'Ethan', 'Isabella', 'Mason']
LAST_NAMES = ['Mehta', 'Patel', 'Menon', 'Wong', 'Kulkarni', 'Sharma', 'Jain', 'Gupta', 'Singh', 'Das',
              'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez']

def generate_profiles(n=TOTAL_EMPLOYEES):
    profiles = []
    for i in range(n):
        first = random.choice(FIRST_NAMES)
        last = random.choice(LAST_NAMES)
        name = f"{first}{last}{i:04d}" # Ensure uniqueness
        dept = random.choice(DEPARTMENTS)
        u_type = random.choice(USER_TYPES)
        loc = random.choice(LOCATIONS)
        # Shift profiles slightly towards specific devices/hours
        normal_hour = random.randint(8, 18)
        profiles.append({
            'user': name,
            'department': dept,
            'user_type': u_type,
            'normal_login_location': loc,
            'normal_hour': normal_hour,
            'trust_score_base': random.randint(50, 95)
        })
    return profiles

def generate_chunk(chunk_id, profiles, count):
    np.random.seed(chunk_id + int(time.time()))
    events = []
    
    for i in range(count):
        prof = random.choice(profiles)
        
        # Decide if anomalous
        is_malicious = np.random.random() < 0.05
        is_impossible_travel = np.random.random() < 0.02
        is_odd_hour = np.random.random() < 0.1
        
        # event_id
        eid = f"E{chunk_id * count + i + 1}"
        
        # Location
        curr_loc = prof['normal_login_location']
        dist = 0
        if is_impossible_travel:
            curr_loc = random.choice([l for l in LOCATIONS if l != prof['normal_login_location']])
            dist = random.randint(1000, 15000)
        
        # Hour
        hour = prof['normal_hour'] + random.randint(-1, 1)
        if is_odd_hour:
            hour = (prof['normal_hour'] + 12) % 24
        hour = hour % 24
        dev = abs(hour - prof['normal_hour'])
        
        # Device
        device = random.choice(DEVICE_TYPES)
        trust = prof['trust_score_base'] + random.randint(-10, 10)
        trust = max(0, min(100, trust))
        
        # IP
        ip = f"192.168.{random.randint(0,255)}.{random.randint(0,255)}"
        ip_cat = "Normal"
        if is_malicious:
            ip_cat = "Malicious"
            
        # Failed attempts
        failed = 0
        if is_malicious or np.random.random() < 0.05:
            failed = random.randint(1, 10)
            
        # baseline_confidence
        conf = random.choice([0, 1, 2])
        
        events.append({
            'event_id': eid,
            'user': prof['user'],
            'department': prof['department'],
            'user_type': prof['user_type'],
            'device_type': device,
            'device_trust_score': trust,
            'ip_address': ip,
            'ip_category': ip_cat,
            'normal_login_location': prof['normal_login_location'],
            'current_login_location': curr_loc,
            'failed_attempts_last_15min': failed,
            'odd_hour': is_odd_hour,
            'impossible_travel': is_impossible_travel,
            'login_hour': hour,
            'hour_deviation': dev,
            'location_distance_km': dist,
            'ip_category_encoded': 1 if ip_cat == 'Malicious' else 0,
            'is_odd_hour_numeric': 1 if is_odd_hour else 0,
            'baseline_confidence': conf
        })
        
    return events

if __name__ == "__main__":
    print(f"Generating {TOTAL_EMPLOYEES} employee profiles...")
    profiles = generate_profiles()
    
    # Save LDAP Info
    ldap_df = pd.DataFrame(profiles)
    ldap_path = os.path.abspath("backend/data/ldap_logs.csv")
    ldap_df.to_csv(ldap_path, index=False)
    print(f"LDAP info saved to {ldap_path}")
    
    print(f"Generating {TOTAL_EVENTS} auth events using {NUM_CORES} cores...")
    
    with mp.Pool(processes=NUM_CORES) as pool:
        results = [pool.apply_async(generate_chunk, (i, profiles, CHUNK_SIZE)) for i in range(NUM_CORES)]
        all_chunks = [res.get() for res in results]
        
    # Flatten list
    all_events = [event for chunk in all_chunks for event in chunk]
    
    df = pd.DataFrame(all_events)
    output_path = os.path.abspath("backend/data/auth_logs.csv")
    df.to_csv(output_path, index=False)
    print(f"Successfully generated {len(df)} events into {output_path}")
