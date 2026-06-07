"""Argus pipeline package.

Re-exports the primary entry points for backward compatibility:
  from pipeline import run_pipeline, get_progress, build_snapshot
"""

from pipeline.pipeline import run_pipeline
from pipeline.health import get_progress
from pipeline.snapshot import build_snapshot

__all__ = ["run_pipeline", "get_progress", "build_snapshot"]
