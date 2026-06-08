"""Per-member AI processing: base model call, deep search, pro validation."""

import json

from helpers import fingerprint, safe_text, clamp_float
from matching import matches_member, member_aliases, member_domains
from search.policy import should_deep_search, should_pro_validate
from models import (
    BASE_SYSTEM_PROMPT,
    PRO_SYSTEM_PROMPT,
    call_model as _default_call_model,
    evidence_text_for_pro,
    normalize_status,
)
from snapshot import default_impact_weight, default_persistence_days
from local_search import LocalArticleSearch
from relevance import ArticleRelevanceEngine


def get_local_candidates(conn, member: dict, aliases: list) -> list:
    """Search local RSS cache for relevant articles about a member.

    Returns list of item dicts ready for AI processing (same shape as RSS items).
    Only returns articles with relevance_score >= 0.45 and no noise flags.
    """
    local_search = LocalArticleSearch(conn)
    relevance_engine = ArticleRelevanceEngine()

    local_articles = local_search.search(
        member_name=member["name"],
        aliases=aliases,
        lookback_days=14,
        max_candidates=10,
    )

    candidates = []
    for article in local_articles:
        analysis = relevance_engine.analyze(article, member["name"], aliases)
        score = analysis["relevance_score"]
        noise_type = analysis["noise_type"]

        if score < 0.45 or noise_type in ("comparison_only", "irrelevant"):
            continue

        # Look up source name
        source_name = "Local RSS"
        src_id = article.get("source_id")
        if src_id:
            row = conn.execute(
                "SELECT name FROM sources WHERE id = ?", (src_id,)
            ).fetchone()
            if row:
                source_name = row["name"]

        candidates.append({
            "title": article["title"],
            "url": article["url"],
            "published": article.get("published_at", ""),
            "snippet": article.get("snippet", ""),
            "source_name": source_name,
            "source_id": src_id or 0,
            "source_logo": "",
            "_source": "local",
            "_relevance_score": score,
        })

    return candidates


def filter_and_deduplicate(member, all_items, conn):
    """Pre-filter RSS items for a member and remove already-seen fingerprints.

    Returns (mb_dict, new_items, aliases_str, domains_str) or None if no work.
    """
    mb = dict(member)
    domains_list = member_domains(conn, mb["id"])
    domain_str = ", ".join(domains_list) if domains_list else ""
    aliases_str = ", ".join(member_aliases(mb))

    matching = [item for item in all_items if matches_member(item["title"], item["snippet"], mb)]
    if not matching:
        return None

    new_items = []
    for item in matching:
        fp = fingerprint(item["url"], item["title"])
        exists = conn.execute("SELECT id FROM events WHERE fingerprint = ?", (fp,)).fetchone()
        if not exists:
            new_items.append(item)

    if not new_items:
        return None

    return mb, new_items[:10], aliases_str, domain_str


def process_member_items(
    idx: int,
    mb: dict,
    items: list,
    aliases_str: str,
    domains_str: str,
    base_model: dict,
    pro_model: dict | None,
    pro_enabled: bool,
    deep_search_enabled: bool,
    lang_instruction: str,
    search_policy,
    pro_validation_config,
    get_deep_budget,
    consume_deep_budget,
    update_member_status,
    router_factory=None,
    call_model_fn=None,
) -> list[dict]:
    """Process one member's items.  Returns list of event dicts to insert."""
    if call_model_fn is None:
        call_model_fn = _default_call_model
    update_member_status(idx, "running")
    results = []
    for item in items:
        fp = fingerprint(item["url"], item["title"])
        try:
            system = BASE_SYSTEM_PROMPT.format(
                name=mb["name"], aliases=aliases_str, domains=domains_str,
                lang_instruction=lang_instruction,
            )
            user_msg = f"标题={item['title']}｜来源={item['source_name']}｜发布={item['published']}｜摘要={item['snippet']}"
            result = call_model_fn(base_model, system, user_msg)

            sentiment = result.get("sentiment", 0)
            importance = result.get("importance", 0)
            impact_weight = clamp_float(result.get("impactWeight", result.get("impact_weight")), 0.0, 100.0, default_impact_weight(importance))
            impact_persistence_days = clamp_float(result.get("impactPersistenceDays", result.get("impact_persistence_days")), 1.0, 365.0, default_persistence_days(importance))
            impact_confidence = clamp_float(result.get("impactConfidence", result.get("impact_confidence")), 0.0, 1.0, 0.5)
            impact_rationale = result.get("impactRationale", result.get("impact_rationale", ""))
            kind = result.get("kind", "secondary")
            event_type = result.get("event_type", "other")
            valid_event_types = {
                "model_release", "funding", "acquisition", "lawsuit", "policy",
                "security_incident", "pricing_change", "partnership",
                "leadership_change", "product_update", "market_move", "other",
            }
            if event_type not in valid_event_types:
                event_type = "other"
            need_search = result.get("need_search", False)
            need_pro = result.get("need_pro", False)
            reason = result.get("reason", "")
            short_label = result.get("short_label", "")
            rumor = 0.5
            supporting_sources = [item["source_name"]]
            search_evidence: list[dict] = []

            if not short_label or short_label == reason or len(short_label) > 25:
                short_label = item["title"][:20]
            status = "watch"

            # Deep search — hybrid policy decision
            policy_decision = should_deep_search(
                item, result, search_policy,
                budget_remaining=get_deep_budget(),
                member_tier=mb.get("effective_tier", "primary"),
            )
            if policy_decision.should_search and deep_search_enabled and router_factory:
                consume_deep_budget()
                local_router = router_factory()
                sr_response = local_router.deep(
                    f"{mb['name']} {item['title']}", max_results=3, member_id=str(mb["id"]),
                )
                evidence = [r.to_dict() for r in sr_response.results] if sr_response.results else []
                if evidence:
                    search_evidence = evidence
                    supporting_sources = [e.get("url") or e.get("title", "") for e in evidence if e.get("url") or e.get("title")] or supporting_sources
                    reason = f"deep_search: {reason}"

            # Pro cross-validation — policy-gated
            pro_decision = should_pro_validate(
                item, result, pro_validation_config,
                pro_model_available=pro_model is not None and pro_enabled,
            )
            if pro_decision.should_validate:
                try:
                    base_json = json.dumps({
                        "sentiment": sentiment, "importance": importance, "kind": kind, "status": status,
                        "short_label": short_label, "impactWeight": impact_weight,
                        "impactPersistenceDays": impact_persistence_days, "impactConfidence": impact_confidence,
                        "impactRationale": impact_rationale, "reason": reason,
                    }, ensure_ascii=False)
                    pro_result = call_model_fn(pro_model, PRO_SYSTEM_PROMPT.format(
                        name=mb["name"], aliases=aliases_str, domains=domains_str,
                        title=item["title"], outlet=item["source_name"], published=item["published"],
                        base_json=base_json, evidence=evidence_text_for_pro(item, search_evidence),
                        lang_instruction=lang_instruction,
                    ), "只输出 JSON。")
                    sentiment = clamp_float(pro_result.get("sentiment"), -1.0, 1.0, sentiment)
                    importance = clamp_float(pro_result.get("importance"), 0.0, 1.0, importance)
                    impact_weight = clamp_float(pro_result.get("impactWeight", pro_result.get("impact_weight")), 0.0, 100.0, impact_weight)
                    impact_persistence_days = clamp_float(pro_result.get("impactPersistenceDays", pro_result.get("impact_persistence_days")), 1.0, 365.0, impact_persistence_days)
                    impact_confidence = clamp_float(pro_result.get("impactConfidence", pro_result.get("impact_confidence")), 0.0, 1.0, impact_confidence)
                    impact_rationale = pro_result.get("impactRationale", pro_result.get("impact_rationale", impact_rationale))
                    kind = pro_result.get("kind", kind)
                    status = normalize_status(pro_result.get("status"), status)
                    rumor = clamp_float(pro_result.get("rumor"), 0.0, 1.0, rumor)
                    pro_note = pro_result.get("note", "")
                    if pro_note and len(pro_note) <= 25:
                        short_label = pro_note
                    pro_sources = pro_result.get("sources")
                    if isinstance(pro_sources, list):
                        cleaned = [str(s) for s in pro_sources if s]
                        if cleaned:
                            supporting_sources = cleaned
                    reason = f"pro: {reason}"
                except Exception as e:
                    status = "watch"
                    reason = f"pro_error: {safe_text(e, 180)}; {reason}"

            if importance < 0.15:
                continue

            # Compose route_reason with policy scores
            policy_info = ""
            if policy_decision.scores:
                s = policy_decision.scores
                policy_info = f" | policy:{policy_decision.reason} score={s.get('final_score',0):.2f}"
            if pro_decision.should_validate:
                policy_info += f" | pro:{pro_decision.reason}"
            results.append({
                "fingerprint": fp, "member_id": mb["id"], "title": item["title"],
                "url": item["url"], "outlet": item["source_name"], "published": item["published"],
                "sentiment": sentiment, "importance": importance, "impact_weight": impact_weight,
                "impact_persistence_days": impact_persistence_days, "impact_confidence": impact_confidence,
                "impact_rationale": impact_rationale, "kind": kind, "event_type": event_type, "status": status,
                "note": short_label, "rumor": rumor,
                "sources": json.dumps(supporting_sources, ensure_ascii=False),
                "need_pro": 1 if pro_decision.should_validate else 0, "route_reason": f"{reason}{policy_info}",
            })
        except Exception as e:
            print(f"    {mb['name']} error: {safe_text(e)}")
    return results
