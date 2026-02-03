import pandas as pd
import os

def analyze():
    path = os.path.abspath("backend/data/auth_logs.csv")
    if not os.path.exists(path):
        print(f"Error: {path} not found.")
        return
        
    df = pd.read_csv(path)
    total = len(df)
    
    malicious_ip = len(df[df["ip_category"] == "Malicious"])
    impossible_travel = len(df[df["impossible_travel"] == True])
    odd_hour = len(df[df["odd_hour"] == True])
    
    # Combined (at least one anomaly indicator)
    any_anomaly = len(df[
        (df["ip_category"] == "Malicious") | 
        (df["impossible_travel"] == True) | 
        (df["odd_hour"] == True)
    ])
    
    # Clean anomalies (multi-factor)
    multi_factor = len(df[
        ((df["ip_category"] == "Malicious") & (df["impossible_travel"] == True)) |
        ((df["ip_category"] == "Malicious") & (df["odd_hour"] == True)) |
        ((df["impossible_travel"] == True) & (df["odd_hour"] == True))
    ])

    print(f"Dataset Analysis Results:")
    print(f"--------------------------")
    print(f"Total Auth Events: {total:,}")
    print(f"1. Malicious IP Detection: {malicious_ip:,} ({(malicious_ip/total)*100:.1f}%)")
    print(f"2. Impossible Travel: {impossible_travel:,} ({(impossible_travel/total)*100:.1f}%)")
    print(f"3. Odd Hour Logins: {odd_hour:,} ({(odd_hour/total)*100:.1f}%)")
    print(f"--------------------------")
    print(f"Total Unique Anomalous Events: {any_anomaly:,} ({(any_anomaly/total)*100:.1f}%)")
    print(f"High-Confidence (Multi-Factor): {multi_factor:,} ({(multi_factor/total)*100:.1f}%)")

if __name__ == "__main__":
    analyze()
