"""
Benchmark catalog service - discovers benchmarks dynamically via `bench list`.
Falls back to static list when CLI is unavailable.
"""

import asyncio
import json
import shutil
import subprocess
import time
from dataclasses import dataclass
from typing import Optional

from app.db.models import Benchmark


@dataclass
class CacheEntry:
    """Cached data with expiration."""
    data: list[Benchmark]
    expires_at: float


class BenchmarkCatalog:
    """
    Service for retrieving benchmark metadata.
    
    Attempts to discover benchmarks dynamically via `bench list`.
    Falls back to a static list if the CLI is unavailable.
    Caches results with a configurable TTL.
    """
    
    # Cache TTL in seconds (10 minutes)
    CACHE_TTL = 600
    
    def __init__(self):
        self._cache: Optional[CacheEntry] = None
        self._details_cache: dict[str, Benchmark] = {}
        
    def _is_bench_available(self) -> bool:
        """Check if the 'bench' CLI is available."""
        return shutil.which("bench") is not None
    
    def _parse_bench_list_output(self, output: str) -> list[Benchmark]:
        """
        Parse the output of `bench list`.
        
        Expected format (one benchmark per line):
        - mmlu: Massive Multitask Language Understanding
        - humaneval: Python programming problems
        ...
        
        Or JSON format if available.
        """
        benchmarks = []
        
        # Try JSON parsing first
        try:
            data = json.loads(output)
            if isinstance(data, list):
                for item in data:
                    if isinstance(item, dict):
                        benchmarks.append(Benchmark(
                            name=item.get("name", ""),
                            category=item.get("category", "general"),
                            description_short=item.get("description", item.get("description_short", "")),
                            tags=item.get("tags", []),
                        ))
                    elif isinstance(item, str):
                        benchmarks.append(Benchmark(
                            name=item,
                            category="general",
                            description_short="",
                            tags=[],
                        ))
                return benchmarks
        except json.JSONDecodeError:
            pass
        
        # Parse line-by-line format
        for line in output.strip().split("\n"):
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            
            # Handle "- name: description" format
            if line.startswith("- "):
                line = line[2:]
            
            # Split by colon for "name: description"
            if ":" in line:
                parts = line.split(":", 1)
                name = parts[0].strip()
                desc = parts[1].strip() if len(parts) > 1 else ""
            else:
                name = line
                desc = ""
            
            if name:
                benchmarks.append(Benchmark(
                    name=name,
                    category="general",
                    description_short=desc,
                    tags=[],
                ))
        
        return benchmarks
    
    def _discover_benchmarks_sync(self) -> Optional[list[Benchmark]]:
        """
        Synchronously discover benchmarks via CLI.
        Returns None if discovery fails.
        """
        if not self._is_bench_available():
            return None
        
        try:
            result = subprocess.run(
                ["bench", "list"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0:
                return self._parse_bench_list_output(result.stdout)
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass
        
        return None
    
    async def _discover_benchmarks(self) -> Optional[list[Benchmark]]:
        """
        Asynchronously discover benchmarks via CLI.
        Returns None if discovery fails.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._discover_benchmarks_sync)
    
    def _get_static_benchmarks(self) -> list[Benchmark]:
        """Return the static fallback benchmark list."""
        return [
            Benchmark(
                name="mmlu",
                category="knowledge",
                description_short="Massive Multitask Language Understanding - tests knowledge across 57 subjects",
                description="MMLU (Massive Multitask Language Understanding) is a benchmark that tests "
                           "language models on 57 subjects ranging from STEM to humanities. It evaluates "
                           "both world knowledge and problem solving ability.",
                tags=["knowledge", "reasoning", "multi-subject"],
            ),
            Benchmark(
                name="humaneval",
                category="coding",
                description_short="Python programming problems testing code generation",
                description="HumanEval consists of 164 hand-written Python programming problems. "
                           "Each problem includes a function signature, docstring, body, and unit tests. "
                           "Models are evaluated on functional correctness.",
                tags=["coding", "python", "generation"],
            ),
            Benchmark(
                name="gsm8k",
                category="math",
                description_short="Grade school math word problems",
                description="GSM8K is a dataset of 8.5K high-quality grade school math word problems. "
                           "These problems require multi-step reasoning to solve. Models are evaluated "
                           "on their ability to produce correct final answers.",
                tags=["math", "reasoning", "word-problems"],
            ),
            Benchmark(
                name="hellaswag",
                category="commonsense",
                description_short="Commonsense reasoning about physical situations",
                description="HellaSwag is a challenge dataset for evaluating commonsense NLI. "
                           "Models must select the most plausible continuation for scenarios involving "
                           "physical activities and common situations.",
                tags=["commonsense", "reasoning"],
            ),
            Benchmark(
                name="arc",
                category="science",
                description_short="AI2 Reasoning Challenge - grade school science questions",
                description="The AI2 Reasoning Challenge (ARC) consists of 7,787 science exam questions. "
                           "The Challenge Set contains only questions that were answered incorrectly by "
                           "both a retrieval-based algorithm and a word co-occurrence algorithm.",
                tags=["science", "reasoning", "multiple-choice"],
            ),
            Benchmark(
                name="truthfulqa",
                category="safety",
                description_short="Questions designed to test truthfulness and avoid common misconceptions",
                description="TruthfulQA measures whether a language model is truthful in generating "
                           "answers to questions. It contains 817 questions spanning 38 categories, "
                           "including health, law, finance and politics.",
                tags=["truthfulness", "safety", "qa"],
            ),
            Benchmark(
                name="winogrande",
                category="commonsense",
                description_short="Winograd Schema Challenge for commonsense reasoning",
                description="WinoGrande is a large-scale dataset of 44k problems inspired by Winograd "
                           "Schema Challenge. It tests commonsense reasoning by requiring models to "
                           "resolve pronoun references correctly.",
                tags=["commonsense", "reasoning", "coreference"],
            ),
            Benchmark(
                name="mbpp",
                category="coding",
                description_short="Mostly Basic Programming Problems - Python coding tasks",
                description="MBPP (Mostly Basic Programming Problems) consists of around 1,000 crowd-sourced "
                           "Python programming problems. Each problem includes a task description, code solution, "
                           "and 3 automated test cases.",
                tags=["coding", "python", "generation"],
            ),
            Benchmark(
                name="drop",
                category="reading",
                description_short="Discrete Reasoning Over Paragraphs - reading comprehension",
                description="DROP is a reading comprehension benchmark requiring discrete reasoning over "
                           "paragraphs. Questions require counting, sorting, addition, or other discrete operations.",
                tags=["reading", "reasoning", "math"],
            ),
            Benchmark(
                name="bigbench",
                category="diverse",
                description_short="BIG-Bench - diverse collection of challenging tasks",
                description="BIG-Bench is a collaborative benchmark with 204 diverse tasks covering "
                           "linguistics, childhood development, math, common-sense reasoning, biology, "
                           "physics, social bias, and software development.",
                tags=["diverse", "reasoning", "comprehensive"],
            ),
        ]
    
    async def get_benchmarks(self, force_refresh: bool = False) -> list[Benchmark]:
        """
        Get all available benchmarks.
        
        Uses cached data if available and not expired.
        Attempts dynamic discovery, falls back to static list.
        """
        now = time.time()
        
        # Check cache
        if not force_refresh and self._cache and self._cache.expires_at > now:
            return self._cache.data
        
        # Try dynamic discovery
        benchmarks = await self._discover_benchmarks()
        
        # Fall back to static list
        if not benchmarks:
            benchmarks = self._get_static_benchmarks()
        
        # Update cache
        self._cache = CacheEntry(
            data=benchmarks,
            expires_at=now + self.CACHE_TTL,
        )
        
        # Also populate details cache
        for b in benchmarks:
            self._details_cache[b.name] = b
        
        return benchmarks
    
    async def get_benchmark(self, name: str) -> Optional[Benchmark]:
        """
        Get a specific benchmark by name.
        
        Attempts to use cache, then discovery, then static lookup.
        """
        # Check details cache
        if name in self._details_cache:
            return self._details_cache[name]
        
        # Ensure main cache is populated
        benchmarks = await self.get_benchmarks()
        
        # Look up in cache
        if name in self._details_cache:
            return self._details_cache[name]
        
        # Try to get more details via bench describe (if available)
        if self._is_bench_available():
            details = await self._describe_benchmark(name)
            if details:
                self._details_cache[name] = details
                return details
        
        return None
    
    async def _describe_benchmark(self, name: str) -> Optional[Benchmark]:
        """
        Get detailed information about a benchmark via `bench describe`.
        """
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(None, self._describe_benchmark_sync, name)
    
    def _describe_benchmark_sync(self, name: str) -> Optional[Benchmark]:
        """Synchronously get benchmark details."""
        if not self._is_bench_available():
            return None
        
        try:
            result = subprocess.run(
                ["bench", "describe", name],
                capture_output=True,
                text=True,
                timeout=10,
            )
            if result.returncode == 0:
                # Try to parse JSON output
                try:
                    data = json.loads(result.stdout)
                    return Benchmark(
                        name=data.get("name", name),
                        category=data.get("category", "general"),
                        description_short=data.get("description_short", ""),
                        description=data.get("description", ""),
                        tags=data.get("tags", []),
                    )
                except json.JSONDecodeError:
                    # Return basic benchmark with output as description
                    return Benchmark(
                        name=name,
                        category="general",
                        description_short=result.stdout.strip()[:200],
                        description=result.stdout.strip(),
                        tags=[],
                    )
        except (subprocess.TimeoutExpired, subprocess.SubprocessError):
            pass
        
        return None
    
    def clear_cache(self) -> None:
        """Clear all cached data."""
        self._cache = None
        self._details_cache.clear()


# Global instance
benchmark_catalog = BenchmarkCatalog()


# Convenience functions for backward compatibility
async def get_benchmarks() -> list[Benchmark]:
    """Get all available benchmarks."""
    return await benchmark_catalog.get_benchmarks()


async def get_benchmark(name: str) -> Optional[Benchmark]:
    """Get a benchmark by name."""
    return await benchmark_catalog.get_benchmark(name)
