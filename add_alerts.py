#!/usr/bin/env python3
"""
Real-time Alert Generator for Better than Cisco
Continuously adds new security alerts to the eve.json file (newline-delimited JSON)
"""

import json
import time
import random
from datetime import datetime, timezone
from pathlib import Path

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

def suricata_timestamp():
    zoned = datetime.now(timezone.utc).astimezone()
    return zoned.strftime("%Y-%m-%dT%H:%M:%S.%f%z")


def generate_alert():
    """Generate a new alert based on templates"""
    template = random.choice(ALERT_TEMPLATES)

    timestamp = suricata_timestamp()
    src_ip = generate_ip()
    dest_ip = generate_ip()
    direction = random.choice(["to_server", "to_client"])

    alert = {
        "timestamp": timestamp,
        "flow_id": random.randint(100000000000000, 999999999999999),
        "in_iface": "simulated0",
        "event_type": "alert",
        "src_ip": src_ip,
        "src_port": random.randint(1024, 65535),
        "dest_ip": dest_ip,
        "dest_port": random.choice([22, 53, 80, 443, 3389, 8080, 3306, 5432]),
        "proto": template["proto"],
        "ip_v": 4,
        "pkt_src": "generated",
        "direction": direction,
        "pcap_cnt": random.randint(1000, 999999),
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
            "start": suricata_timestamp(),
            "src_ip": src_ip,
            "dest_ip": dest_ip
        }
    }

    return alert

def add_alert_to_file(filename="eve.json"):
    """Append a new alert to the NDJSON file."""
    try:
        eve_path = Path(filename)
        eve_path.parent.mkdir(parents=True, exist_ok=True)
        if not eve_path.exists():
            eve_path.touch()

        new_alert = generate_alert()

        with eve_path.open('a', encoding='utf-8') as handle:
            handle.write(json.dumps(new_alert))
            handle.write('\n')

        severity_map = {1: "CRITICAL", 2: "HIGH", 3: "MEDIUM", 4: "LOW"}
        severity_level = severity_map.get(new_alert['alert']['severity'], "INFO")

        print(
            f"[{datetime.now().strftime('%H:%M:%S')}] ✓ Added alert: {new_alert['alert']['signature']} "
            f"({severity_level}) | {new_alert['src_ip']}:{new_alert['src_port']} → "
            f"{new_alert['dest_ip']}:{new_alert['dest_port']}"
        )

        return True
    except Exception as exc:
        print(f"[ERROR] Failed to add alert: {exc}")
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
