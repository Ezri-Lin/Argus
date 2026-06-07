"""Hybrid EscalationPolicy — rule scoring + AI risk scoring for deep search trigger.

Local rules provide explainability and hard gates.
BASE AI provides semantic risk assessment.
Combined score determines whether to trigger deep search (Tavily).
"""

from __future__ import annotations

import dataclasses
import json
from dataclasses import dataclass, field


@dataclass
class PolicyConfig:
    # Hard gate settings
    deep_search_enabled: bool = True

    # Rule scoring: event types
    risk_event_types: list[str] = field(default_factory=lambda: [
        "pricing_change", "funding", "acquisition", "lawsuit",
        "policy", "security_incident",
    ])
    always_search_event_types: list[str] = field(default_factory=lambda: [
        "model_release", "pricing_change", "acquisition",
    ])

    # Combined score weights
    rule_weight: float = 0.45
    ai_need_weight: float = 0.35
    evidence_gap_weight: float = 0.20

    # Thresholds
    importance_threshold: float = 0.65
    trigger_gte: float = 0.68
    watch_band_gte: float = 0.52
    force_trigger_gte: float = 0.85

    # Tier adjustment
    tier_adjustment: dict = field(default_factory=lambda: {
        "primary": 0.05,
        "secondary": -0.05,
        "ai_candidate": -1.0,
    })

    @classmethod
    def from_settings(cls, conn) -> PolicyConfig:
        row = conn.execute(
            "SELECT value FROM settings WHERE key = 'search_policy_config'"
        ).fetchone()
        if row:
            try:
                data = json.loads(row["value"])
                # Filter to known fields only, ignore extras
                known = {f.name for f in dataclasses.fields(cls)}
                filtered = {k: v for k, v in data.items() if k in known}
                return cls(**filtered)
            except Exception:
                pass
        return cls()


@dataclass
class PolicyDecision:
    should_search: bool
    reason: str
    scores: dict = field(default_factory=dict)


# ── Hard gates ──


def check_hard_blocks(
    bundle: dict,
    member_tier: str,
    policy: PolicyConfig,
    budget_remaining: int,
) -> str | None:
    """Return block reason string, or None if allowed."""
    if not policy.deep_search_enabled:
        return "deep_search_disabled"
    if budget_remaining == 0:
        return "daily_cap_reached"
    if member_tier == "ai_candidate":
        return "ai_candidate_member"
    if bundle.get("_duplicate_recent"):
        return "duplicate_recent_event"
    return None


# ── Rule scoring ──


def calc_rule_score(bundle: dict, base_score: dict) -> tuple[float, list[str]]:
    """Compute rule-based escalation score (0..1) with named trigger signals."""
    score = 0.0
    signals: list[str] = []

    # Single source → needs corroboration
    n_sources = bundle.get("n_independent_sources", 1)
    if n_sources < 2:
        score += 0.25
        signals.append("single_source")

    # High importance
    importance = float(base_score.get("importance", 0))
    if importance >= 0.65:
        score += 0.25
        signals.append(f"importance>={0.65}")

    # Event types that warrant verification
    kind = base_score.get("kind", "")
    high_risk_types = {
        "pricing_change", "funding", "acquisition", "lawsuit",
        "policy", "security_incident", "model_release",
    }
    if kind in high_risk_types:
        score += 0.20
        signals.append(f"type={kind}")

    # Risk flags from BASE
    flags = set(base_score.get("risk_flags", []))
    if "rumor" in flags:
        score += 0.20
        signals.append("rumor")
    if "contradiction" in flags:
        score += 0.30
        signals.append("contradiction")
    if "old_news" in flags:
        score += 0.15
        signals.append("old_news")

    # Source diversity
    diversity = bundle.get("source_diversity", 1.0)
    if diversity < 0.5:
        score += 0.10
        signals.append("low_diversity")

    return min(score, 1.0), signals


# ── Combined scoring ──


def calc_combined_score(
    rule_score: float,
    ai_need: float,
    evidence_gap: float,
    policy: PolicyConfig,
) -> float:
    return (
        policy.rule_weight * rule_score
        + policy.ai_need_weight * ai_need
        + policy.evidence_gap_weight * evidence_gap
    )


# ── Main decision ──


def should_deep_search(
    bundle: dict,
    base_score: dict,
    policy: PolicyConfig,
    budget_remaining: int = -1,
    member_tier: str = "primary",
) -> PolicyDecision:
    """Hybrid escalation: hard gate → rule score → AI score → combined → threshold.

    bundle: the news item dict (title, snippet, source_name, etc.)
    base_score: the BASE model's JSON output (importance, kind, need_search, etc.)
    policy: PolicyConfig loaded from DB
    budget_remaining: -1 means unlimited
    member_tier: "primary" | "secondary" | "ai_candidate"
    """
    scores: dict = {}

    # 1. Hard gate
    block = check_hard_blocks(bundle, member_tier, policy, budget_remaining)
    if block:
        return PolicyDecision(False, block, scores)

    # 2. Rule score
    rule_score, signals = calc_rule_score(bundle, base_score)
    scores["rule_score"] = round(rule_score, 3)
    scores["trigger_signals"] = signals

    # 3. AI scores (from BASE output)
    ai_need = float(base_score.get("deep_search_need", 0.0))
    evidence_sufficiency = float(base_score.get("evidence_sufficiency", 0.5))
    evidence_gap = 1.0 - evidence_sufficiency
    scores["ai_need"] = round(ai_need, 3)
    scores["evidence_sufficiency"] = round(evidence_sufficiency, 3)
    scores["evidence_gap"] = round(evidence_gap, 3)

    # 4. Combined
    combined = calc_combined_score(rule_score, ai_need, evidence_gap, policy)
    scores["combined"] = round(combined, 3)

    # 5. Tier adjustment
    tier_adj = policy.tier_adjustment.get(member_tier, 0.0)
    final_score = combined + tier_adj
    scores["tier_adjustment"] = tier_adj
    scores["final_score"] = round(final_score, 3)

    # 6. Threshold check
    if final_score >= policy.force_trigger_gte:
        return PolicyDecision(True, "force_trigger", scores)

    if final_score >= policy.trigger_gte:
        return PolicyDecision(True, "score_trigger", scores)

    if final_score >= policy.watch_band_gte:
        # Watch band: Primary with budget can trigger
        if member_tier == "primary" and budget_remaining > 0:
            return PolicyDecision(True, "watch_band_primary", scores)
        return PolicyDecision(False, "watch_band_no_action", scores)

    return PolicyDecision(False, "below_threshold", scores)
