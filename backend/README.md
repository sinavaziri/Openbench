# OpenBench Web Backend

FastAPI backend for running OpenBench benchmarks via a web UI.

## Setup

```bash
pip install -e .
```

## Run

```bash
uvicorn app.main:app --reload
```

## API Endpoints

- `GET /api/health` - Health check
- `GET /api/benchmarks` - List available benchmarks
- `POST /api/runs` - Start a new run
- `GET /api/runs` - List all runs
- `GET /api/runs/{id}` - Get run details

