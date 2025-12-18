import json
from datetime import datetime
from typing import Optional

from app.db.session import get_db
from app.db.models import Run, RunConfig, RunCreate, RunStatus, RunSummary


class RunStore:
    """Service for storing and retrieving runs from SQLite."""

    async def create_run(self, run_create: RunCreate, user_id: Optional[str] = None) -> Run:
        """Create a new run and store it in the database."""
        config = RunConfig(**run_create.model_dump())
        run = Run(
            benchmark=run_create.benchmark,
            model=run_create.model,
            config=config,
            user_id=user_id,
        )
        
        async with get_db() as db:
            await db.execute(
                """
                INSERT INTO runs (
                    run_id, user_id, benchmark, model, status, created_at,
                    started_at, finished_at, artifact_dir, exit_code, error, config_json
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (
                    run.run_id,
                    run.user_id,
                    run.benchmark,
                    run.model,
                    run.status.value,
                    run.created_at.isoformat(),
                    None,
                    None,
                    run.artifact_dir,
                    run.exit_code,
                    run.error,
                    config.model_dump_json(),
                ),
            )
            await db.commit()
        
        return run

    async def get_run(self, run_id: str, user_id: Optional[str] = None) -> Optional[Run]:
        """
        Get a run by ID.
        
        If user_id is provided, only returns the run if it belongs to that user
        or if the run has no owner (legacy runs).
        """
        async with get_db() as db:
            if user_id is not None:
                cursor = await db.execute(
                    "SELECT * FROM runs WHERE run_id = ? AND (user_id = ? OR user_id IS NULL)",
                    (run_id, user_id),
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM runs WHERE run_id = ?", (run_id,)
                )
            row = await cursor.fetchone()
            if row is None:
                return None
            return self._row_to_run(row)

    async def list_runs(self, limit: int = 50, user_id: Optional[str] = None) -> list[RunSummary]:
        """
        List recent runs.
        
        If user_id is provided, only returns runs belonging to that user
        or legacy runs (with no owner).
        """
        async with get_db() as db:
            if user_id is not None:
                cursor = await db.execute(
                    "SELECT * FROM runs WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC LIMIT ?",
                    (user_id, limit),
                )
            else:
                cursor = await db.execute(
                    "SELECT * FROM runs ORDER BY created_at DESC LIMIT ?", (limit,)
                )
            rows = await cursor.fetchall()
            return [self._row_to_summary(row) for row in rows]

    async def update_run(
        self,
        run_id: str,
        status: Optional[RunStatus] = None,
        started_at: Optional[datetime] = None,
        finished_at: Optional[datetime] = None,
        artifact_dir: Optional[str] = None,
        exit_code: Optional[int] = None,
        error: Optional[str] = None,
        primary_metric: Optional[float] = None,
        primary_metric_name: Optional[str] = None,
    ) -> Optional[Run]:
        """Update a run's fields."""
        updates = []
        params = []
        
        if status is not None:
            updates.append("status = ?")
            params.append(status.value)
        if started_at is not None:
            updates.append("started_at = ?")
            params.append(started_at.isoformat())
        if finished_at is not None:
            updates.append("finished_at = ?")
            params.append(finished_at.isoformat())
        if artifact_dir is not None:
            updates.append("artifact_dir = ?")
            params.append(artifact_dir)
        if exit_code is not None:
            updates.append("exit_code = ?")
            params.append(exit_code)
        if error is not None:
            updates.append("error = ?")
            params.append(error)
        if primary_metric is not None:
            updates.append("primary_metric = ?")
            params.append(primary_metric)
        if primary_metric_name is not None:
            updates.append("primary_metric_name = ?")
            params.append(primary_metric_name)
        
        if not updates:
            return await self.get_run(run_id)
        
        params.append(run_id)
        query = f"UPDATE runs SET {', '.join(updates)} WHERE run_id = ?"
        
        async with get_db() as db:
            await db.execute(query, params)
            await db.commit()
        
        return await self.get_run(run_id)

    def _row_to_run(self, row) -> Run:
        """Convert a database row to a Run model."""
        config = None
        if row["config_json"]:
            config = RunConfig(**json.loads(row["config_json"]))
        
        return Run(
            run_id=row["run_id"],
            user_id=row["user_id"],
            benchmark=row["benchmark"],
            model=row["model"],
            status=RunStatus(row["status"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            started_at=datetime.fromisoformat(row["started_at"]) if row["started_at"] else None,
            finished_at=datetime.fromisoformat(row["finished_at"]) if row["finished_at"] else None,
            artifact_dir=row["artifact_dir"],
            exit_code=row["exit_code"],
            error=row["error"],
            config=config,
            primary_metric=row["primary_metric"],
            primary_metric_name=row["primary_metric_name"],
        )

    def _row_to_summary(self, row) -> RunSummary:
        """Convert a database row to a RunSummary model."""
        return RunSummary(
            run_id=row["run_id"],
            benchmark=row["benchmark"],
            model=row["model"],
            status=RunStatus(row["status"]),
            created_at=datetime.fromisoformat(row["created_at"]),
            finished_at=datetime.fromisoformat(row["finished_at"]) if row["finished_at"] else None,
            primary_metric=row["primary_metric"],
            primary_metric_name=row["primary_metric_name"],
        )


# Global instance
run_store = RunStore()

