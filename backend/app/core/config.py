import os
import secrets
from pathlib import Path

# Base directories
# In Docker, data is at /app/data; locally, it's at PROJECT_ROOT/data
if os.path.exists("/app/data"):
    # Running in Docker container
    DATA_DIR = Path("/app/data")
else:
    # Running locally
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

# Auth settings
# Generate a random secret key if not set (for development)
# In production, set OPENBENCH_SECRET_KEY environment variable
SECRET_KEY = os.getenv("OPENBENCH_SECRET_KEY", secrets.token_urlsafe(32))
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Encryption key for API keys (32 bytes for AES-256)
# In production, set OPENBENCH_ENCRYPTION_KEY environment variable
ENCRYPTION_KEY = os.getenv("OPENBENCH_ENCRYPTION_KEY", secrets.token_urlsafe(32)[:32])

