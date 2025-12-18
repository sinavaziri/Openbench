#!/bin/bash
# Simple script to run a benchmark with Groq

API_BASE="http://localhost:8000"
BENCHMARK="gsm8k"  # Simple math benchmark
MODEL="groq/llama-3.1-8b-instant"  # Fast Groq model
LIMIT=5  # Only run 5 examples for a quick test

echo "🔐 Login to OpenBench"
echo "===================="
echo ""

# Prompt for credentials
read -p "Email: " EMAIL
read -sp "Password: " PASSWORD
echo ""
echo ""

# Login and get token
echo "Logging in..."
LOGIN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"email\": \"${EMAIL}\", \"password\": \"${PASSWORD}\"}")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"access_token":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ Login failed!"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ Logged in successfully!"
echo ""

# Start the benchmark run
echo "🚀 Starting benchmark run..."
echo "   Benchmark: ${BENCHMARK}"
echo "   Model: ${MODEL}"
echo "   Limit: ${LIMIT} examples"
echo ""

RUN_RESPONSE=$(curl -s -X POST "${API_BASE}/api/runs" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ${TOKEN}" \
  -d "{\"benchmark\": \"${BENCHMARK}\", \"model\": \"${MODEL}\", \"limit\": ${LIMIT}}")

RUN_ID=$(echo $RUN_RESPONSE | grep -o '"run_id":"[^"]*' | cut -d'"' -f4)

if [ -z "$RUN_ID" ]; then
  echo "❌ Failed to start run!"
  echo "$RUN_RESPONSE"
  exit 1
fi

echo "✅ Run started with ID: ${RUN_ID}"
echo ""
echo "📊 Monitoring run progress..."
echo "   (Press Ctrl+C to stop monitoring)"
echo ""

# Monitor the run
LAST_STATUS=""
while true; do
  RUN_DATA=$(curl -s -X GET "${API_BASE}/api/runs/${RUN_ID}?log_lines=5" \
    -H "Authorization: Bearer ${TOKEN}")
  
  STATUS=$(echo $RUN_DATA | grep -o '"status":"[^"]*' | cut -d'"' -f4)
  
  # Print status updates
  if [ "$STATUS" != "$LAST_STATUS" ]; then
    case $STATUS in
      "queued")
        echo "⏳ Status: QUEUED"
        ;;
      "running")
        echo "⏳ Status: RUNNING"
        ;;
      "completed")
        echo "✅ Status: COMPLETED!"
        break
        ;;
      "failed")
        echo "❌ Status: FAILED"
        break
        ;;
      "canceled")
        echo "🛑 Status: CANCELED"
        break
        ;;
    esac
    LAST_STATUS=$STATUS
  fi
  
  sleep 2
done

echo ""
echo "========================================"
echo "RESULTS"
echo "========================================"
echo ""

# Get final results
FINAL_DATA=$(curl -s -X GET "${API_BASE}/api/runs/${RUN_ID}?log_lines=20" \
  -H "Authorization: Bearer ${TOKEN}")

# Extract primary metric
PRIMARY_METRIC=$(echo $FINAL_DATA | grep -o '"primary_metric":[^,]*' | cut -d':' -f2)
PRIMARY_METRIC_NAME=$(echo $FINAL_DATA | grep -o '"primary_metric_name":"[^"]*' | cut -d'"' -f4)

if [ ! -z "$PRIMARY_METRIC_NAME" ]; then
  echo "📈 Primary Metric: ${PRIMARY_METRIC_NAME}: ${PRIMARY_METRIC}"
fi

echo ""
echo "🔗 View full details at: http://localhost:3000/runs/${RUN_ID}"
echo "========================================"

