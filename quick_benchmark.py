#!/usr/bin/env python3
"""
Quick benchmark runner using built-in urllib (no external dependencies)
"""
import json
import sys
import time
import urllib.request
import urllib.error

API_BASE = "http://localhost:8000"

def api_call(method, endpoint, data=None, token=None):
    """Make an API call."""
    url = f"{API_BASE}{endpoint}"
    headers = {"Content-Type": "application/json"}
    
    if token:
        headers["Authorization"] = f"Bearer {token}"
    
    if data:
        data = json.dumps(data).encode('utf-8')
    
    req = urllib.request.Request(url, data=data, headers=headers, method=method)
    
    try:
        with urllib.request.urlopen(req) as response:
            return json.loads(response.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        error_body = e.read().decode('utf-8')
        print(f"❌ API Error ({e.code}): {error_body}")
        return None

def main():
    if len(sys.argv) < 3:
        print("Usage: python quick_benchmark.py <email> <password>")
        print()
        print("Example:")
        print("  python quick_benchmark.py user@example.com mypassword")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    # Login
    print("🔐 Logging in...")
    login_data = api_call("POST", "/api/auth/login", {
        "email": email,
        "password": password
    })
    
    if not login_data or "access_token" not in login_data:
        print("❌ Login failed!")
        sys.exit(1)
    
    token = login_data["access_token"]
    print(f"✅ Logged in as {email}\n")
    
    # Start benchmark run
    benchmark = "gsm8k"
    model = "groq/llama-3.1-8b-instant"
    limit = 5
    
    print("🚀 Starting benchmark run:")
    print(f"   Benchmark: {benchmark}")
    print(f"   Model: {model}")
    print(f"   Limit: {limit} examples\n")
    
    run_data = api_call("POST", "/api/runs", {
        "benchmark": benchmark,
        "model": model,
        "limit": limit
    }, token)
    
    if not run_data or "run_id" not in run_data:
        print("❌ Failed to start run!")
        sys.exit(1)
    
    run_id = run_data["run_id"]
    print(f"✅ Run started with ID: {run_id}\n")
    
    # Monitor the run
    print("📊 Monitoring run progress...")
    print("   (Press Ctrl+C to stop monitoring)\n")
    
    last_status = None
    while True:
        run_info = api_call("GET", f"/api/runs/{run_id}?log_lines=5", None, token)
        
        if not run_info:
            break
        
        status = run_info.get("status")
        
        # Print status updates
        if status != last_status:
            status_emoji = {
                "queued": "⏳",
                "running": "🔄",
                "completed": "✅",
                "failed": "❌",
                "canceled": "🛑"
            }
            print(f"{status_emoji.get(status, '❓')} Status: {status.upper()}")
            last_status = status
        
        # Show recent output
        stdout_tail = run_info.get("stdout_tail", [])
        if stdout_tail and len(stdout_tail) > 0:
            last_line = stdout_tail[-1].strip()
            if last_line:
                print(f"   {last_line}")
        
        # Check if done
        if status in ["completed", "failed", "canceled"]:
            break
        
        time.sleep(2)
    
    # Show results
    print("\n" + "="*60)
    print("RESULTS")
    print("="*60 + "\n")
    
    if run_info and run_info.get("status") == "completed":
        primary_metric = run_info.get("primary_metric")
        primary_metric_name = run_info.get("primary_metric_name")
        
        if primary_metric_name:
            print(f"📈 {primary_metric_name}: {primary_metric}")
        
        summary = run_info.get("summary")
        if summary:
            metrics = summary.get("metrics", {})
            if metrics:
                print("\n📊 All Metrics:")
                for key, value in metrics.items():
                    print(f"   {key}: {value}")
        
        print(f"\n🔗 View details: http://localhost:3000/runs/{run_id}")
    else:
        error = run_info.get("error", "Unknown error")
        print(f"❌ Run did not complete successfully: {error}")
    
    print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(0)

