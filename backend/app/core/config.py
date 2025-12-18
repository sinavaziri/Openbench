from pathlib import Path

# Base directories
PROJECT_ROOT = Path(__file__).parent.parent.parent.parent
DATA_DIR = PROJECT_ROOT / "data"
RUNS_DIR = DATA_DIR / "runs"

# Ensure directories exist
RUNS_DIR.mkdir(parents=True, exist_ok=True)

# Database
DATABASE_PATH = DATA_DIR / "openbench.db"

# API settings
API_PREFIX = "/api"

# Config version for reproducibility
CONFIG_SCHEMA_VERSION = 1

