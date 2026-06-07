from __future__ import annotations

import json
from dataclasses import dataclass, field


@dataclass
class PolicyConfig:
    importance_threshold: float = 0.65
    min_independent_sources: int = 2
    risk_event_types: list[str] = field(default_factory=list)
    always_search_event_types: list[str] = field(default_factory=list)

    @classmethod
    def from_settings(cls, conn) -> PolicyConfig:
        row = conn.execute(
            "SELECT value FROM settings WHERE key = 'search_policy_config'"
        ).fetchone()
        if row:
            try:
                data = json.loads(row["value"])
                return cls(**data)
            except Exception:
                pass
        return cls()


@dataclass
class PolicyDecision:
    should_search: bool
    reason: str


def should_deep_search(
    bundle: dict,
    base_score: dict,
    policy: PolicyConfig,
    budget_remaining: int = -1,
) -> PolicyDecision:
    """Decide whether to trigger deep search after BASE analysis.

    bundle: the news item dict (title, snippet, source_name, etc.)
    base_score: the BASE model's JSON output (sentiment, importance, need_search, etc.)
    policy: PolicyConfig loaded from DB
    budget_remaining: -1 means unlimited
    """
    if budget_remaining == 0:
        return PolicyDecision(False, "daily budget exhausted")

    reasons: list[str] = []

    # Rule 1: LLM already flagged it
    if base_score.get("need_search"):
        reasons.append("base_llm_flagged")

    # Rule 2: High importance
    importance = float(base_score.get("importance", 0))
    if importance >= policy.importance_threshold:
        reasons.append(f"importance={importance:.2f}>={policy.importance_threshold}")

    # Rule 3: Specific event types that always warrant search
    kind = base_score.get("kind", "")
    if kind in policy.always_search_event_types:
        reasons.append(f"event_type={kind}")

    # Rule 4: Risk flags
    if kind in policy.risk_event_types:
        reasons.append(f"risk_type={kind}")

    should = len(reasons) > 0
    return PolicyDecision(should, "; ".join(reasons) if reasons else "no_trigger")
