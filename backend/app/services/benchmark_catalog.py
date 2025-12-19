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
        
        Expected format: 3-column table
         benchmark_id        Display Name          Description...
                                                   (continuation lines...)
        
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
        
        # Box drawing characters to skip
        box_chars = {'─', '│', '┌', '┐', '└', '┘', '├', '┤', '┬', '┴', '┼', 
                    '╭', '╮', '╯', '╰', '═', '║', '╔', '╗', '╚', '╝', '━', '┃',
                    '┏', '┓', '┗', '┛', '╒', '╓', '╕', '╖', '╘', '╙', '╛', '╜',
                    '╞', '╟', '╡', '╢', '╤', '╥', '╧', '╨', '╪', '╫', '╬',
                    '▀', '▄', '█', '▌', '▐', '░', '▒', '▓'}
        
        # Parse table format - benchmark entries start with exactly one space
        # Format: " benchmark_id        Display Name          Description..."
        import re
        
        for line in output.split("\n"):
            # Skip empty lines
            if not line.strip():
                continue
                
            # Skip lines that are mostly box drawing characters
            if any(c in box_chars for c in line[:5]):
                continue
                
            # Skip header/section lines (e.g., "Available Benchmarks", "Core Benchmarks (57)")
            if re.match(r'^\s*[A-Z][a-z]+.*Benchmark', line):
                continue
            if line.strip().startswith('Total:') or line.strip().startswith('Commands:'):
                break
                
            # Benchmark lines start with exactly 1 space, then the benchmark ID
            # ID is lowercase/numbers/underscores/hyphens, possibly ending with …
            match = re.match(r'^ ([a-z0-9_-]+…?)\s+(.+)', line)
            if match:
                benchmark_id = match.group(1).rstrip('…')  # Remove trailing …
                rest_of_line = match.group(2).strip()
                
                # Parse the rest: Display Name and Description (both optional)
                # Usually separated by multiple spaces, but display name can have spaces
                # The description is typically after ~40+ characters from start
                # For simplicity, we'll use the first portion as display name
                parts = rest_of_line.split(None, 1)
                display_name = parts[0] if parts else ""
                description = parts[1] if len(parts) > 1 else ""
                
                # Validate benchmark ID
                if len(benchmark_id) >= 3 and len(benchmark_id) <= 50:
                    # Try to extract category from context (section headers)
                    category = "general"
                    
                    benchmarks.append(Benchmark(
                        name=benchmark_id,
                        category=category,
                        description_short=description[:200] if description else display_name,
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
                ["bench", "list", "--all"],
                capture_output=True,
                text=True,
                timeout=30,
            )
            if result.returncode == 0 and result.stdout.strip():
                parsed = self._parse_bench_list_output(result.stdout)
                # Only return if we got valid benchmarks (more than just noise)
                if parsed and len(parsed) >= 5:
                    # Filter out invalid entries
                    valid_benchmarks = [
                        b for b in parsed 
                        if len(b.name) >= 3 and len(b.name) <= 40 
                        and not b.name in ['about', 'for', 'with', 'and', 'the', 'from', 'this', 'that']
                    ]
                    if len(valid_benchmarks) >= 5:
                        return valid_benchmarks
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
    
    def _get_featured_benchmarks(self) -> list[Benchmark]:
        """Return the featured/popular benchmark list (always shown as cards)."""
        return [
            Benchmark(
                name="mmlu",
                category="knowledge",
                description_short="Massive Multitask Language Understanding - tests knowledge across 57 subjects",
                description="MMLU (Massive Multitask Language Understanding) is a benchmark that tests "
                           "language models on 57 subjects ranging from STEM to humanities. It evaluates "
                           "both world knowledge and problem solving ability.",
                tags=["knowledge", "reasoning", "multi-subject"],
                featured=True,
            ),
            Benchmark(
                name="humaneval",
                category="coding",
                description_short="Python programming problems testing code generation",
                description="HumanEval consists of 164 hand-written Python programming problems. "
                           "Each problem includes a function signature, docstring, body, and unit tests. "
                           "Models are evaluated on functional correctness.",
                tags=["coding", "python", "generation"],
                featured=True,
            ),
            Benchmark(
                name="gsm8k",
                category="math",
                description_short="Grade school math word problems",
                description="GSM8K is a dataset of 8.5K high-quality grade school math word problems. "
                           "These problems require multi-step reasoning to solve. Models are evaluated "
                           "on their ability to produce correct final answers.",
                tags=["math", "reasoning", "word-problems"],
                featured=True,
            ),
            Benchmark(
                name="hellaswag",
                category="commonsense",
                description_short="Commonsense reasoning about physical situations",
                description="HellaSwag is a challenge dataset for evaluating commonsense NLI. "
                           "Models must select the most plausible continuation for scenarios involving "
                           "physical activities and common situations.",
                tags=["commonsense", "reasoning"],
                featured=True,
            ),
            Benchmark(
                name="arc",
                category="science",
                description_short="AI2 Reasoning Challenge - grade school science questions",
                description="The AI2 Reasoning Challenge (ARC) consists of 7,787 science exam questions. "
                           "The Challenge Set contains only questions that were answered incorrectly by "
                           "both a retrieval-based algorithm and a word co-occurrence algorithm.",
                tags=["science", "reasoning", "multiple-choice"],
                featured=True,
            ),
            Benchmark(
                name="truthfulqa",
                category="safety",
                description_short="Questions designed to test truthfulness and avoid common misconceptions",
                description="TruthfulQA measures whether a language model is truthful in generating "
                           "answers to questions. It contains 817 questions spanning 38 categories, "
                           "including health, law, finance and politics.",
                tags=["truthfulness", "safety", "qa"],
                featured=True,
            ),
            Benchmark(
                name="winogrande",
                category="commonsense",
                description_short="Winograd Schema Challenge for commonsense reasoning",
                description="WinoGrande is a large-scale dataset of 44k problems inspired by Winograd "
                           "Schema Challenge. It tests commonsense reasoning by requiring models to "
                           "resolve pronoun references correctly.",
                tags=["commonsense", "reasoning", "coreference"],
                featured=True,
            ),
            Benchmark(
                name="mbpp",
                category="coding",
                description_short="Mostly Basic Programming Problems - Python coding tasks",
                description="MBPP (Mostly Basic Programming Problems) consists of around 1,000 crowd-sourced "
                           "Python programming problems. Each problem includes a task description, code solution, "
                           "and 3 automated test cases.",
                tags=["coding", "python", "generation"],
                featured=True,
            ),
            Benchmark(
                name="drop",
                category="reading",
                description_short="Discrete Reasoning Over Paragraphs - reading comprehension",
                description="DROP is a reading comprehension benchmark requiring discrete reasoning over "
                           "paragraphs. Questions require counting, sorting, addition, or other discrete operations.",
                tags=["reading", "reasoning", "math"],
                featured=True,
            ),
            Benchmark(
                name="bigbench",
                category="diverse",
                description_short="BIG-Bench - diverse collection of challenging tasks",
                description="BIG-Bench is a collaborative benchmark with 204 diverse tasks covering "
                           "linguistics, childhood development, math, common-sense reasoning, biology, "
                           "physics, social bias, and software development.",
                tags=["diverse", "reasoning", "comprehensive"],
                featured=True,
            ),
            # Additional benchmarks for pagination demo
            Benchmark(name="boolq", category="reading", description_short="Boolean questions from natural queries", tags=["qa", "reading"], featured=False),
            Benchmark(name="piqa", category="commonsense", description_short="Physical commonsense reasoning", tags=["commonsense"], featured=False),
            Benchmark(name="siqa", category="commonsense", description_short="Social interaction QA", tags=["commonsense", "social"], featured=False),
            Benchmark(name="openbookqa", category="science", description_short="Elementary science questions", tags=["science", "qa"], featured=False),
            Benchmark(name="squad", category="reading", description_short="Stanford Question Answering Dataset", tags=["reading", "qa"], featured=False),
            Benchmark(name="race", category="reading", description_short="Reading comprehension from exams", tags=["reading"], featured=False),
            Benchmark(name="math", category="math", description_short="Competition mathematics problems", tags=["math", "reasoning"], featured=False),
            Benchmark(name="gpqa", category="science", description_short="Graduate-level science questions", tags=["science", "expert"], featured=False),
            Benchmark(name="mmmu", category="diverse", description_short="Multimodal understanding benchmark", tags=["multimodal", "diverse"], featured=False),
            Benchmark(name="mathvista", category="math", description_short="Mathematical reasoning in visual contexts", tags=["math", "multimodal"], featured=False),
            Benchmark(name="medqa", category="science", description_short="Medical exam questions", tags=["medical", "science"], featured=False),
            Benchmark(name="pubmedqa", category="science", description_short="Biomedical question answering", tags=["medical", "science"], featured=False),
            Benchmark(name="triviaqa", category="knowledge", description_short="Trivia questions with evidence", tags=["knowledge", "qa"], featured=False),
            Benchmark(name="naturalqa", category="knowledge", description_short="Questions from Google searches", tags=["knowledge", "qa"], featured=False),
            Benchmark(name="coqa", category="reading", description_short="Conversational question answering", tags=["reading", "conversation"], featured=False),
            Benchmark(name="quac", category="reading", description_short="Question answering in context", tags=["reading", "conversation"], featured=False),
            Benchmark(name="hotpotqa", category="reading", description_short="Multi-hop question answering", tags=["reading", "reasoning"], featured=False),
            Benchmark(name="commonsenseqa", category="commonsense", description_short="Commonsense question answering", tags=["commonsense", "qa"], featured=False),
            Benchmark(name="socialiqa", category="commonsense", description_short="Social situations reasoning", tags=["commonsense", "social"], featured=False),
            Benchmark(name="cosmosqa", category="commonsense", description_short="Commonsense reading comprehension", tags=["commonsense", "reading"], featured=False),
            Benchmark(name="anli", category="reading", description_short="Adversarial NLI", tags=["reading", "nli"], featured=False),
            Benchmark(name="mnli", category="reading", description_short="Multi-genre NLI", tags=["reading", "nli"], featured=False),
            Benchmark(name="snli", category="reading", description_short="Stanford NLI", tags=["reading", "nli"], featured=False),
            Benchmark(name="wnli", category="reading", description_short="Winograd NLI", tags=["reading", "nli"], featured=False),
            Benchmark(name="rte", category="reading", description_short="Recognizing textual entailment", tags=["reading", "nli"], featured=False),
        ]
    
    async def get_benchmarks(self, force_refresh: bool = False) -> list[Benchmark]:
        """
        Get all available benchmarks.
        
        Uses cached data if available and not expired.
        Merges featured benchmarks with dynamically discovered ones.
        Featured benchmarks always appear first.
        """
        now = time.time()
        
        # Check cache
        if not force_refresh and self._cache and self._cache.expires_at > now:
            return self._cache.data
        
        # Always start with featured benchmarks
        featured = self._get_featured_benchmarks()
        featured_names = {b.name for b in featured}
        
        # Try to discover additional benchmarks dynamically
        discovered = await self._discover_benchmarks()
        
        # Filter out any discovered benchmarks that are already in featured
        additional = []
        if discovered:
            additional = [b for b in discovered if b.name not in featured_names]
        
        # Combine: featured first, then additional (sorted by name)
        all_benchmarks = featured + sorted(additional, key=lambda b: b.name)
        
        # Update cache
        self._cache = CacheEntry(
            data=all_benchmarks,
            expires_at=now + self.CACHE_TTL,
        )
        
        # Also populate details cache
        for b in all_benchmarks:
            self._details_cache[b.name] = b
        
        return all_benchmarks
    
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
