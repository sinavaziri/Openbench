from pathlib import Path
from typing import Optional

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
    """List all artifact files for a run."""
    artifact_dir = RUNS_DIR / run_id
    if not artifact_dir.exists():
        return []
    return [f.name for f in artifact_dir.iterdir() if f.is_file()]

