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

    async def execute_run(self, run: Run) -> None:
        """Execute a run asynchronously."""
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
        
        try:
            with open(stdout_path, "w") as stdout_file, open(stderr_path, "w") as stderr_file:
                # Start subprocess
                process = subprocess.Popen(
                    cmd,
                    stdout=stdout_file,
                    stderr=stderr_file,
                    cwd=str(artifact_dir),
                    env={**os.environ},
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
                if exit_code == 0:
                    status = RunStatus.COMPLETED
                    error = None
                else:
                    status = RunStatus.FAILED
                    # Read stderr for error message
                    with open(stderr_path, "r") as f:
                        error = f.read()[-1000:]  # Last 1000 chars
                
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
        
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()
        
        self._running_processes.pop(run_id, None)
        
        await run_store.update_run(
            run_id,
            status=RunStatus.CANCELED,
            finished_at=datetime.utcnow(),
        )
        return True


# Global instance
executor = RunExecutor()

