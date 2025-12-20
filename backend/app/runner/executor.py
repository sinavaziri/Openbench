import asyncio
import json
import os
import shutil
import subprocess
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.core.config import RUNS_DIR
from app.db.models import Run, RunConfig, RunStatus
from app.runner.command_builder import build_mock_command, command_to_string
from app.runner.summary_parser import parse_and_write_summary
from app.services.run_store import run_store


class RunExecutor:
    """Executes benchmark runs as subprocesses."""

    def __init__(self):
        self._running_processes: dict[str, subprocess.Popen] = {}
        self._canceled_runs: set[str] = set()  # Track runs being canceled

    def _create_artifact_dir(self, run_id: str) -> Path:
        """Create the artifact directory for a run."""
        artifact_dir = RUNS_DIR / run_id
        artifact_dir.mkdir(parents=True, exist_ok=True)
        return artifact_dir

    def _write_config(self, artifact_dir: Path, config: RunConfig) -> None:
        """Write the run configuration to config.json."""
        config_path = artifact_dir / "config.json"
        with open(config_path, "w") as f:
            json.dump(config.model_dump(), f, indent=2)

    def _write_command(self, artifact_dir: Path, cmd: list[str]) -> None:
        """Write the command to command.txt."""
        command_path = artifact_dir / "command.txt"
        with open(command_path, "w") as f:
            f.write(command_to_string(cmd))

    def _check_bench_available(self) -> bool:
        """Check if the 'bench' CLI is available."""
        return shutil.which("bench") is not None

    async def execute_run(self, run: Run, api_keys: Optional[dict[str, str]] = None) -> None:
        """
        Execute a run asynchronously.
        
        Args:
            run: The run to execute
            api_keys: Optional dict of environment variable names to API key values
                      to inject into the subprocess environment
        """
        if run.config is None:
            await run_store.update_run(
                run.run_id,
                status=RunStatus.FAILED,
                finished_at=datetime.utcnow(),
                error="No configuration provided",
            )
            return

        # Create artifact directory
        artifact_dir = self._create_artifact_dir(run.run_id)
        
        # Write config and command
        self._write_config(artifact_dir, run.config)
        
        # Determine command (real or mock)
        if self._check_bench_available():
            from app.runner.command_builder import build_command
            cmd = build_command(run.config)
        else:
            # Use mock command for development
            duration = min(run.config.limit or 5, 10)  # Cap at 10 seconds
            cmd = build_mock_command(run.config, duration)
        
        self._write_command(artifact_dir, cmd)
        
        # Update run status to running
        await run_store.update_run(
            run.run_id,
            status=RunStatus.RUNNING,
            started_at=datetime.utcnow(),
            artifact_dir=str(artifact_dir),
        )
        
        # Open log files
        stdout_path = artifact_dir / "stdout.log"
        stderr_path = artifact_dir / "stderr.log"
        
        # Build environment with API keys
        env = {**os.environ}
        if api_keys:
            env.update(api_keys)
        
        try:
            with open(stdout_path, "w") as stdout_file, open(stderr_path, "w") as stderr_file:
                # Start subprocess
                process = subprocess.Popen(
                    cmd,
                    stdout=stdout_file,
                    stderr=stderr_file,
                    cwd=str(artifact_dir),
                    env=env,
                )
                
                self._running_processes[run.run_id] = process
                
                # Wait for completion in a thread to not block
                loop = asyncio.get_event_loop()
                exit_code = await loop.run_in_executor(None, process.wait)
                
                # Remove from running processes
                self._running_processes.pop(run.run_id, None)
                
                # Check if this run was canceled (don't overwrite canceled status)
                if run.run_id in self._canceled_runs:
                    self._canceled_runs.discard(run.run_id)
                    # Run was canceled, status already updated by cancel_run
                    # Just write meta.json with the canceled status
                    meta = {
                        "exit_code": exit_code,
                        "finished_at": datetime.utcnow().isoformat(),
                        "status": RunStatus.CANCELED.value,
                    }
                    with open(artifact_dir / "meta.json", "w") as f:
                        json.dump(meta, f, indent=2)
                    return
                
                # Update run with results
                # Read stdout and stderr to detect failures
                with open(stdout_path, "r") as f:
                    stdout_content = f.read()
                with open(stderr_path, "r") as f:
                    stderr_content = f.read()
                
                # Detect benchmark failures even if exit code is 0
                # The bench CLI sometimes returns 0 even when tasks fail
                failure_patterns = [
                    "Task interrupted (no samples completed",
                    "Error code:",
                    "NotFoundError:",
                    "does not exist or you do not have access",
                    "model_not_found",
                    "AuthenticationError:",
                    "PermissionDeniedError:",
                    "RateLimitError:",
                ]
                
                detected_failure = False
                error = None
                for pattern in failure_patterns:
                    if pattern in stdout_content or pattern in stderr_content:
                        detected_failure = True
                        # Extract error message from stdout (bench CLI outputs errors to stdout)
                        content = stdout_content if pattern in stdout_content else stderr_content
                        
                        # Look for specific error messages at the end of output
                        lines = content.split('\n')
                        
                        # Find the actual error message (usually after the traceback)
                        error_msg_lines = []
                        found_error_type = False
                        for i, line in enumerate(lines):
                            # Look for the actual error type and message (e.g., "NotFoundError: Error code: 404")
                            if any(err_type in line for err_type in ['Error:', 'Error code:', 'interrupted']):
                                # This is likely the actual error message
                                found_error_type = True
                                # Get this line and a few after it
                                for j in range(i, min(i + 5, len(lines))):
                                    clean_line = lines[j].strip()
                                    # Skip box drawing characters and empty lines
                                    if clean_line and not all(c in '─│╭╮╯╰├┤┬┴┼═╔╗╚╝╠╣╦╩╬' for c in clean_line):
                                        error_msg_lines.append(clean_line)
                                break
                        
                        if error_msg_lines:
                            error = '\n'.join(error_msg_lines[:5])  # First 5 meaningful lines
                        elif found_error_type:
                            # If we found error type but no clean lines, use a generic message
                            error = f"Benchmark failed with {pattern}"
                        
                        if not error:
                            # Fallback: get last 500 chars
                            error = content[-500:].strip()
                        break
                
                if exit_code == 0 and not detected_failure:
                    status = RunStatus.COMPLETED
                    error = None
                elif exit_code == 0 and detected_failure:
                    status = RunStatus.FAILED
                    error = error or "Benchmark failed but returned exit code 0"
                else:
                    status = RunStatus.FAILED
                    error = error or stderr_content[-1000:] if stderr_content else f"Process exited with code {exit_code}"
                
                # Parse and write summary.json
                primary_metric_value: Optional[float] = None
                primary_metric_name: Optional[str] = None
                try:
                    summary = parse_and_write_summary(artifact_dir)
                    if summary.primary_metric:
                        primary_metric_value = summary.primary_metric.value
                        primary_metric_name = summary.primary_metric.name
                except Exception as e:
                    # Summary parsing is best-effort, don't fail the run
                    pass
                
                # Write meta.json
                meta = {
                    "exit_code": exit_code,
                    "finished_at": datetime.utcnow().isoformat(),
                    "status": status.value,
                }
                with open(artifact_dir / "meta.json", "w") as f:
                    json.dump(meta, f, indent=2)
                
                await run_store.update_run(
                    run.run_id,
                    status=status,
                    finished_at=datetime.utcnow(),
                    exit_code=exit_code,
                    error=error,
                    primary_metric=primary_metric_value,
                    primary_metric_name=primary_metric_name,
                )
                
        except Exception as e:
            self._running_processes.pop(run.run_id, None)
            await run_store.update_run(
                run.run_id,
                status=RunStatus.FAILED,
                finished_at=datetime.utcnow(),
                error=str(e),
            )

    async def cancel_run(self, run_id: str) -> bool:
        """Cancel a running process."""
        process = self._running_processes.get(run_id)
        if process is None:
            return False
        
        # Mark as canceled before terminating to prevent race condition
        self._canceled_runs.add(run_id)
        
        try:
            process.terminate()
            try:
                process.wait(timeout=5)
            except subprocess.TimeoutExpired:
                process.kill()
        except (PermissionError, OSError) as e:
            # On some systems (e.g., macOS with code signing), we may not be able
            # to terminate the process. In this case, we still mark it as canceled
            # and let the process finish naturally.
            pass
        
        self._running_processes.pop(run_id, None)
        
        await run_store.update_run(
            run_id,
            status=RunStatus.CANCELED,
            finished_at=datetime.utcnow(),
        )
        return True


# Global instance
executor = RunExecutor()

