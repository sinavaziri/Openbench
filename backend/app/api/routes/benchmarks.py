from fastapi import APIRouter, HTTPException

from app.db.models import Benchmark
from app.services.benchmark_catalog import get_benchmark, get_benchmarks

router = APIRouter()


@router.get("/benchmarks", response_model=list[Benchmark])
async def list_benchmarks():
    """
    List all available benchmarks.
    
    Dynamically discovers benchmarks via `bench list` if available,
    otherwise returns a curated static list.
    """
    return await get_benchmarks()


@router.get("/benchmarks/{name}", response_model=Benchmark)
async def get_benchmark_detail(name: str):
    """
    Get details for a specific benchmark.
    
    Returns extended information including full description if available.
    """
    benchmark = await get_benchmark(name)
    if benchmark is None:
        raise HTTPException(status_code=404, detail="Benchmark not found")
    return benchmark
