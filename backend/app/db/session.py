import aiosqlite
from contextlib import asynccontextmanager
from app.core.config import DATABASE_PATH


async def init_db():
    """Initialize the database with required tables."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS runs (
                run_id TEXT PRIMARY KEY,
                benchmark TEXT NOT NULL,
                model TEXT NOT NULL,
                status TEXT NOT NULL DEFAULT 'queued',
                created_at TEXT NOT NULL,
                started_at TEXT,
                finished_at TEXT,
                artifact_dir TEXT,
                exit_code INTEGER,
                error TEXT,
                config_json TEXT
            )
        """)
        await db.commit()


@asynccontextmanager
async def get_db():
    """Get a database connection."""
    async with aiosqlite.connect(DATABASE_PATH) as db:
        db.row_factory = aiosqlite.Row
        yield db

