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
    # Simple mock that sleeps then outputs some fake results
    script = f'''
import time
import json
import sys

benchmark = "{config.benchmark}"
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

# Output mock results
result = {{
    "benchmark": benchmark,
    "model": model,
    "accuracy": 0.85,
    "total_samples": limit,
    "completed_samples": limit
}}
print("RESULTS:", json.dumps(result))
'''
    return ["python", "-c", script]


def command_to_string(cmd: list[str]) -> str:
    """Convert command list to a shell-safe string for logging."""
    import shlex
    return " ".join(shlex.quote(arg) for arg in cmd)
