import json
from pathlib import Path
from typing import Any, Optional

from app.core.config import RUNS_DIR


def get_artifact_path(run_id: str, filename: str) -> Optional[Path]:
    """Get the path to an artifact file."""
    path = RUNS_DIR / run_id / filename
    if path.exists():
        return path
    return None


def read_log_tail(run_id: str, log_name: str = "stdout.log", lines: int = 100) -> Optional[str]:
    """Read the last N lines of a log file."""
    path = get_artifact_path(run_id, log_name)
    if path is None:
        return None
    
    try:
        with open(path, "r") as f:
            all_lines = f.readlines()
            return "".join(all_lines[-lines:])
    except Exception:
        return None


def read_command(run_id: str) -> Optional[str]:
    """Read the command.txt file for a run."""
    path = get_artifact_path(run_id, "command.txt")
    if path is None:
        return None
    
    try:
        with open(path, "r") as f:
            return f.read().strip()
    except Exception:
        return None


def list_artifacts(run_id: str) -> list[str]:
    """
    List all artifact files for a run, including files in subdirectories.
    Returns relative paths from the run directory (e.g., 'logs/file.eval').
    """
    artifact_dir = RUNS_DIR / run_id
    if not artifact_dir.exists():
        return []
    
    artifacts = []
    # Add files in the root directory
    for item in artifact_dir.iterdir():
        if item.is_file():
            artifacts.append(item.name)
        elif item.is_dir():
            # Add files in subdirectories with relative paths
            for subfile in item.rglob('*'):
                if subfile.is_file():
                    # Get path relative to artifact_dir
                    rel_path = subfile.relative_to(artifact_dir)
                    artifacts.append(str(rel_path))
    
    return sorted(artifacts)


def read_summary(run_id: str) -> Optional[dict[str, Any]]:
    """Read the summary.json file for a run."""
    path = get_artifact_path(run_id, "summary.json")
    if path is None:
        return None
    
    try:
        with open(path, "r") as f:
            return json.load(f)
    except Exception:
        return None

