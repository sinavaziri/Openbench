# OpenBench Web Backend

FastAPI backend for running OpenBench benchmarks via a web UI.

## Setup

```bash
pip install -e .
```

## Run

```bash
uvicorn app.main:app --reload --port 8000
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `OPENBENCH_SECRET_KEY` | JWT signing secret | Random (dev only) |
| `OPENBENCH_ENCRYPTION_KEY` | API key encryption (32 chars) | Random (dev only) |

**Important**: Set these to fixed values in production!

## API Endpoints

### Authentication
- `POST /api/auth/register` - Create account
- `POST /api/auth/login` - Sign in
- `GET /api/auth/me` - Get current user

### API Keys
- `GET /api/api-keys` - List configured API keys
- `POST /api/api-keys` - Add/update API key
- `DELETE /api/api-keys/{provider}` - Remove API key

### Benchmarks
- `GET /api/benchmarks` - List available benchmarks
- `GET /api/benchmarks/{name}` - Get benchmark details

### Runs
- `POST /api/runs` - Start a new run
- `GET /api/runs` - List all runs
- `GET /api/runs/{id}` - Get run details
- `POST /api/runs/{id}/cancel` - Cancel a run
- `GET /api/runs/{id}/events` - SSE stream for live updates

### Health
- `GET /api/health` - Health check

## Docker

```bash
docker build -t openbench-backend .
docker run -p 8000:8000 -v ./data:/app/data openbench-backend
```

