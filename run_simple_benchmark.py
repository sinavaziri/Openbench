#!/usr/bin/env python3
"""
Simple script to run a benchmark with Groq.
"""
import requests
import sys
import time

# Configuration
API_BASE = "http://localhost:8000"
BENCHMARK = "gsm8k"  # Simple math benchmark
MODEL = "groq/llama-3.1-8b-instant"  # Fast Groq model
LIMIT = 5  # Only run 5 examples for a quick test

def login(email: str, password: str):
    """Login and get auth token."""
    response = requests.post(
        f"{API_BASE}/api/auth/login",
        json={"email": email, "password": password}
    )
    if response.status_code == 200:
        token = response.json()["access_token"]
        print(f"✓ Logged in as {email}")
        return token
    else:
        print(f"✗ Login failed: {response.text}")
        sys.exit(1)

def start_run(token: str):
    """Start a benchmark run."""
    headers = {"Authorization": f"Bearer {token}"}
    
    payload = {
        "benchmark": BENCHMARK,
        "model": MODEL,
        "limit": LIMIT,
    }
    
    print(f"\n🚀 Starting benchmark run:")
    print(f"   Benchmark: {BENCHMARK}")
    print(f"   Model: {MODEL}")
    print(f"   Limit: {LIMIT} examples")
    
    response = requests.post(
        f"{API_BASE}/api/runs",
        json=payload,
        headers=headers
    )
    
    if response.status_code == 200:
        run_id = response.json()["run_id"]
        print(f"✓ Run started with ID: {run_id}")
        return run_id
    else:
        print(f"✗ Failed to start run: {response.text}")
        sys.exit(1)

def check_run_status(token: str, run_id: str):
    """Check the status of a run."""
    headers = {"Authorization": f"Bearer {token}"}
    
    response = requests.get(
        f"{API_BASE}/api/runs/{run_id}",
        headers=headers
    )
    
    if response.status_code == 200:
        data = response.json()
        return data
    else:
        print(f"✗ Failed to get run status: {response.text}")
        return None

def main():
    # Get credentials from command line arguments
    if len(sys.argv) < 3:
        print("Usage: python run_simple_benchmark.py <email> <password>")
        print("Example: python run_simple_benchmark.py user@example.com mypassword")
        sys.exit(1)
    
    email = sys.argv[1]
    password = sys.argv[2]
    
    # Login
    token = login(email, password)
    
    # Start the run
    run_id = start_run(token)
    
    # Monitor the run
    print("\n📊 Monitoring run progress...\n")
    
    last_status = None
    while True:
        run_data = check_run_status(token, run_id)
        if not run_data:
            break
        
        status = run_data["status"]
        
        # Print status updates
        if status != last_status:
            if status == "running":
                print("⏳ Run is now RUNNING...")
            elif status == "completed":
                print("✅ Run COMPLETED!")
                break
            elif status == "failed":
                print(f"❌ Run FAILED: {run_data.get('error', 'Unknown error')}")
                break
            elif status == "canceled":
                print("🛑 Run was CANCELED")
                break
            last_status = status
        
        # Print recent stdout
        stdout_tail = run_data.get("stdout_tail", [])
        if stdout_tail:
            for line in stdout_tail[-3:]:  # Show last 3 lines
                if line.strip():
                    print(f"   {line}")
        
        time.sleep(2)
    
    # Show final results
    if run_data and run_data["status"] == "completed":
        print("\n" + "="*60)
        print("RESULTS")
        print("="*60)
        
        summary = run_data.get("summary")
        if summary:
            metrics = summary.get("metrics", {})
            print(f"\n📈 Primary Metric: {run_data.get('primary_metric_name', 'N/A')}: {run_data.get('primary_metric', 'N/A')}")
            print(f"\n📊 All Metrics:")
            for key, value in metrics.items():
                print(f"   {key}: {value}")
        else:
            print("   (No summary available yet)")
        
        print(f"\n🔗 View full details at: http://localhost:3000/runs/{run_id}")
        print("="*60)

if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print("\n\n⚠️  Interrupted by user")
        sys.exit(0)

