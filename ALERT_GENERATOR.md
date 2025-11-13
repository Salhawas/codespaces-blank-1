# Real-Time Alert Generator

## Description
Python script that continuously generates and adds security alerts to test the real-time alert monitoring features.

## Usage

### Start the Alert Generator
```bash
cd /workspaces/codespaces-blank
python3 add_alerts.py
```

### What It Does
- Generates realistic security alerts every 2-5 seconds
- Adds alerts to `alerts-only.json` in NDJSON format
- Simulates various attack types:
  - Port Scans
  - SQL Injection
  - Brute Force Attacks
  - Malware Detection
  - DDoS Patterns
  - XSS Attempts
  - Privilege Escalation
  - And more...

### Output Example
```
================================================================================
  Better than Cisco - Real-Time Alert Generator
================================================================================
Started at: 2025-11-12 08:15:30
Press Ctrl+C to stop

[08:15:32] ✓ Added alert: SQL Injection Attempt (CRITICAL) | 10.45.23.156:45123 → 10.128.3.45:3306
Total alerts generated: 1
[08:15:35] ✓ Added alert: Suspicious Port Scan Detected (HIGH) | 10.12.89.201:52341 → 10.200.1.5:22
Total alerts generated: 2
```

### Stop the Generator
Press `Ctrl+C` to stop the script gracefully.

## Alert Severities
- **1 = CRITICAL** - Immediate threat (red)
- **2 = HIGH** - Serious threat (orange)
- **3 = MEDIUM** - Moderate concern (yellow)
- **4 = LOW** - Minor issue (blue)

## Testing Real-Time Updates
1. Start the system: `docker compose up -d`
2. Login to the web UI: http://localhost:5173
3. Run the alert generator: `python3 add_alerts.py`
4. Watch the Alerts page update in real-time as new alerts are added!

## Notes
- Vector automatically detects changes to `alerts-only.json`
- New alerts are ingested into ClickHouse within 1-2 seconds
- The web UI refreshes every 5 seconds to show new alerts
