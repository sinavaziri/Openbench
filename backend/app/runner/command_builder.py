from app.db.models import RunConfig


def build_command(config: RunConfig) -> list[str]:
    """
    Build the CLI command for running a benchmark.
    
    For M0, we use a mock command if 'bench' is not available.
    """
    # Check if we should use mock mode (bench not installed)
    # In production, this would be: bench eval <benchmark> --model <model>
    cmd = ["bench", "eval", config.benchmark, "--model", config.model]
    
    if config.limit is not None:
        cmd.extend(["--limit", str(config.limit)])
    
    if config.temperature is not None:
        cmd.extend(["--temperature", str(config.temperature)])
    
    if config.top_p is not None:
        cmd.extend(["--top-p", str(config.top_p)])
    
    if config.max_tokens is not None:
        cmd.extend(["--max-tokens", str(config.max_tokens)])
    
    if config.timeout is not None:
        cmd.extend(["--timeout", str(config.timeout)])
    
    if config.epochs is not None:
        cmd.extend(["--epochs", str(config.epochs)])
    
    if config.max_connections is not None:
        cmd.extend(["--max-connections", str(config.max_connections)])
    
    return cmd


def build_mock_command(config: RunConfig, duration: int = 5) -> list[str]:
    """
    Build a mock command that simulates a benchmark run.
    Used when 'bench' CLI is not available.
    """
    limit = config.limit or 10
    benchmark = config.benchmark
    
    # Simple mock that sleeps then outputs some fake results
    script = f'''
import time
import json
import sys
import random

random.seed(42)  # Reproducible results

benchmark = "{benchmark}"
model = "{config.model}"
limit = {limit}

print("Starting mock benchmark run...")
print(f"Benchmark: {{benchmark}}")
print(f"Model: {{model}}")
print(f"Limit: {{limit}}")
print()

for i in range({duration}):
    print(f"Processing sample {{i+1}}/{{limit}}...")
    time.sleep(1)

print()
print("Run completed successfully!")
print()

# Output mock results with rich structure
# Generate category breakdowns based on benchmark type
categories = {{
    "mmlu": ["math", "physics", "chemistry", "biology", "history", "geography"],
    "hellaswag": ["physical", "social", "temporal", "emotional"],
    "arc": ["easy", "challenge", "scientific"],
    "gsm8k": ["arithmetic", "algebra", "geometry", "word_problems"],
    "humaneval": ["algorithms", "data_structures", "string_manipulation", "math"],
}}

benchmark_categories = categories.get(benchmark.lower(), ["category_a", "category_b", "category_c"])

# Generate breakdown values
breakdown_items = {{}}
for cat in benchmark_categories:
    breakdown_items[cat] = round(random.uniform(0.65, 0.95), 3)

# Calculate overall accuracy as weighted average
accuracy = round(sum(breakdown_items.values()) / len(breakdown_items), 3)

result = {{
    "benchmark": benchmark,
    "model": model,
    "accuracy": accuracy,
    "f1_score": round(accuracy * 0.98, 3),
    "precision": round(accuracy * 1.02, 3),
    "recall": round(accuracy * 0.96, 3),
    "total_samples": limit,
    "completed_samples": limit,
    "category_breakdown": breakdown_items
}}
print("RESULTS:", json.dumps(result))
'''
    return ["python", "-c", script]


def command_to_string(cmd: list[str]) -> str:
    """Convert command list to a shell-safe string for logging."""
    import shlex
    return " ".join(shlex.quote(arg) for arg in cmd)
