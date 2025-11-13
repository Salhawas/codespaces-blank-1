#!/usr/bin/env python3
"""
Real-time Alert Generator for Better than Cisco
Continuously adds new security alerts to the alerts-only.json file
"""

import json
import time
import random
from datetime import datetime, timezone

# Sample alert templates
ALERT_TEMPLATES = [
    {
        "signature": "Suspicious Port Scan Detected",
        "category": "Network Reconnaissance",
        "severity": 2,
        "proto": "TCP"
    },
    {
        "signature": "SQL Injection Attempt",
        "category": "Web Application Attack",
        "severity": 1,
        "proto": "TCP"
    },
    {
        "signature": "Brute Force SSH Login Attempt",
        "category": "Authentication Attack",
        "severity": 2,
        "proto": "TCP"
    },
    {
        "signature": "Malware Communication Detected",
        "category": "Malware Command and Control",
        "severity": 1,
        "proto": "TCP"
    },
    {
        "signature": "Unauthorized DNS Query",
        "category": "Policy Violation",
        "severity": 3,
        "proto": "UDP"
    },
    {
        "signature": "DDoS Attack Pattern",
        "category": "Denial of Service",
        "severity": 1,
        "proto": "TCP"
    },
    {
        "signature": "XSS Attack Attempt",
        "category": "Web Application Attack",
        "severity": 2,
        "proto": "TCP"
    },
    {
        "signature": "Privilege Escalation Attempt",
        "category": "System Compromise",
        "severity": 1,
        "proto": "TCP"
    },
    {
        "signature": "Suspicious File Download",
        "category": "Malware Activity",
        "severity": 2,
        "proto": "HTTP"
    },
    {
        "signature": "Unauthorized Access Attempt",
        "category": "Access Control Violation",
        "severity": 2,
        "proto": "TCP"
    }
]

def generate_ip():
    """Generate random IP address"""
    return f"10.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}"

def generate_alert():
    """Generate a new alert based on templates"""
    template = random.choice(ALERT_TEMPLATES)
    
    alert = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z",
        "flow_id": random.randint(1000000000000000, 9999999999999999),
        "pcap_cnt": random.randint(1000, 999999),
        "event_type": "alert",
        "src_ip": generate_ip(),
        "src_port": random.randint(1024, 65535),
        "dest_ip": generate_ip(),
        "dest_port": random.choice([22, 80, 443, 3389, 8080, 3306, 5432]),
        "proto": template["proto"],
        "alert": {
            "action": "allowed",
            "gid": 1,
            "signature_id": random.randint(2000000, 2999999),
            "rev": 1,
            "signature": template["signature"],
            "category": template["category"],
            "severity": template["severity"]
        },
        "flow": {
            "pkts_toserver": random.randint(1, 100),
            "pkts_toclient": random.randint(1, 100),
            "bytes_toserver": random.randint(100, 10000),
            "bytes_toclient": random.randint(100, 10000),
            "start": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"
        }
    }
    
    return alert

def add_alert_to_file(filename="alerts-only.json"):
    """Add a new alert to the JSON file"""
    try:
        # Read existing alerts
        with open(filename, 'r') as f:
            content = f.read().strip()
            if content:
                # Split by newlines and parse each line as JSON
                alerts = [json.loads(line) for line in content.split('\n') if line.strip()]
            else:
                alerts = []
        
        # Generate new alert
        new_alert = generate_alert()
        alerts.append(new_alert)
        
        # Write back to file (NDJSON format - one JSON per line)
        with open(filename, 'w') as f:
            for alert in alerts:
                f.write(json.dumps(alert) + '\n')
        
        severity_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
        severity_level = severity_map.get(new_alert['alert']['severity'], "INFO")
        
        print(f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Added alert: {new_alert['alert']['signature']} "
              f"({severity_level}) | {new_alert['src_ip']}:{new_alert['src_port']} → "
              f"{new_alert['dest_ip']}:{new_alert['dest_port']}")
        
        return True
    except Exception as e:
        print(f"[ERROR] Failed to add alert: {e}")
        return False

def main():
    """Main loop to continuously add alerts"""
    print("=" * 80)
    print("  Better than Cisco - Real-Time Alert Generator")
    print("=" * 80)
    print(f"Started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print("Press Ctrl+C to stop\n")
    
    alert_count = 0
    
    try:
        while True:
            if add_alert_to_file():
                alert_count += 1
                print(f"Total alerts generated: {alert_count}")
            
            # Wait between 2-5 seconds before adding next alert
            wait_time = random.uniform(2, 5)
            time.sleep(wait_time)
            
    except KeyboardInterrupt:
        print(f"\n\n{'=' * 80}")
        print(f"Stopped. Total alerts generated: {alert_count}")
        print(f"Finished at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 80)

if __name__ == "__main__":
    main()
