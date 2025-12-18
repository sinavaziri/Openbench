from datetime import datetime
from enum import Enum
from typing import Optional
from pydantic import BaseModel, Field
import uuid


class RunStatus(str, Enum):
    QUEUED = "queued"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELED = "canceled"


class RunConfig(BaseModel):
    """Configuration for a benchmark run."""
    schema_version: int = 1  # Config schema version for reproducibility
    benchmark: str
    model: str
    limit: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    timeout: Optional[int] = None
    epochs: Optional[int] = None
    max_connections: Optional[int] = None


class Run(BaseModel):
    """A benchmark run."""
    run_id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    benchmark: str
    model: str
    status: RunStatus = RunStatus.QUEUED
    created_at: datetime = Field(default_factory=datetime.utcnow)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    artifact_dir: Optional[str] = None
    exit_code: Optional[int] = None
    error: Optional[str] = None
    config: Optional[RunConfig] = None


class RunCreate(BaseModel):
    """Request body for creating a run."""
    benchmark: str
    model: str
    limit: Optional[int] = None
    temperature: Optional[float] = None
    top_p: Optional[float] = None
    max_tokens: Optional[int] = None
    timeout: Optional[int] = None
    epochs: Optional[int] = None
    max_connections: Optional[int] = None


class RunSummary(BaseModel):
    """Summary of a run for list views."""
    run_id: str
    benchmark: str
    model: str
    status: RunStatus
    created_at: datetime
    finished_at: Optional[datetime] = None
    primary_metric: Optional[float] = None


class Benchmark(BaseModel):
    """A benchmark definition."""
    name: str
    category: str
    description_short: str
    description: Optional[str] = None  # Full description for detail view
    tags: list[str] = Field(default_factory=list)

