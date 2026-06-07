"""Argus v2 pipeline: RSS → base model → Tavily? → Pro? → events → snapshot → health.

Reads models/sources/members from DB. Writes events/snapshot/health.
"""

import hashlib
import json
import os
import re
import sys
import threading
import traceback
from datetime import datetime, timezone
from pathlib import Path

import feedparser
from dotenv import load_dotenv
from openai import OpenAI

sys.path.insert(0, str(Path(__file__).parent))

from db import get_db, get_model_for_role, get_setting, init_db
from search import SearchRouter
from search.policy import PolicyConfig, should_deep_search

# ── Pipeline progress tracking ──

_pipeline_progress = {
    "running": False,
    "step": "idle",
    "members_done": 0,
    "members_total": 0,
    "rss_sources_done": 0,
    "rss_sources_total": 0,
    "events_found": 0,
    "search_done": 0,
    "search_total": 0,
    "started_at": "",
    "members": [],  # [{name, domain, status, events, log}]
}
_progress_lock = threading.Lock()


def get_progress() -> dict:
    with _progress_lock:
        p = dict(_pipeline_progress)
        p["members"] = [dict(m) for m in p["members"]]
        return p


def _update_progress(**kwargs):
    with _progress_lock:
        _pipeline_progress.update(kwargs)


def _update_member_status(idx: int, status: str, events: int = 0, log: str = ""):
    with _progress_lock:
        members = _pipeline_progress["members"]
        if idx < len(members):
            members[idx]["status"] = status
            if events:
                members[idx]["events"] = events
            if log:
                members[idx]["log"] = log

load_dotenv(Path(__file__).parent.parent / ".env")

try:
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stderr.reconfigure(encoding="utf-8")
except Exception:
    pass

# ── Prompts ──

BASE_SYSTEM_PROMPT = """你是 Argus 情报系统的「初筛分析员」(BASE)。每次只处理一条候选新闻，快速定级并决定要不要深挖/升级。

【输入】
- 监控成员：{name}（别名：{aliases}），所属领域：{domains}
- 候选新闻见用户消息。

【判断项】
1. sentiment 情绪：-1(极利空)~1(极利好)，针对该成员。
2. importance 重要度：0~1。官宣/财报/重大合作/事故 > 行业转载 > 预热吹水；看影响范围与确定性。
3. kind 类型：转载 | 官方一手 | 预告吹水。
4. need_search：满足任一→true：单一来源、标题党、关键数字缺失、与成员关联存疑、疑似旧闻翻炒。
5. need_pro：满足任一→true：importance≥0.6 且单源、信息互相矛盾、疑似重大但未证实、疑似吹水/假料。
6. reason：一句话说明 need_search/need_pro 的依据（必填，用于回溯）。
7. short_label：**2-5个英文或中文词的极简摘要**，描述事件核心内容，不是分析判断。用于在面板格子中快速展示。
   - 好例子："IPO路演中"、"融资4.65亿"、"WWDC新品预热"、"收购谈判中"、"Siri大改版"
   - 坏例子："单一来源报道需验证"（这是reason，不是short_label）
8. impactWeight：0-100，判断这条新闻对该成员的持续影响力，不是一时热度。
   - 80-100 结构性：并购/重大诉讼/核心高管/范式级产品，数月+
   - 50-79 重要：重要发布/重大融资/战略转向，周到月
   - 20-49 常规：功能更新/小合作，天到周
   - 0-19 噪音/日常 PR
9. impactPersistenceDays：影响半衰期天数。噪音约1，常规约7，重要约30，结构性约120+。
10. impactConfidence：0-1，持续影响力判断的置信度。
11. impactRationale：一句话说明为什么给这个持续影响权重。
12. risk_flags：风险信号数组，从以下选取：rumor(疑似传闻)、contradiction(信息矛盾)、old_news(旧闻翻炒)、single_source(单一来源)、source_tier_uncertain(来源可信度不明)。没有则为空数组。
13. evidence_sufficiency：0-1，当前证据是否足够支撑判断。高=证据充分，低=需要补证。
14. uncertainty：0-1，你对自己以上判断的不确定程度。
15. deep_search_need：0-1，是否需要外部搜索补证。1=强烈需要，0=不需要。
16. deep_search_reason：一句话说明为什么需要/不需要补证。

【规则】
- 只依据已知信息，不编造；不确定就压低 importance 并置 need_search/need_pro=true。
- 严格只输出下面的 JSON，不要任何额外文字或 markdown。
- {lang_instruction}

【输出】
{{"sentiment":0.0,"importance":0.0,"kind":"转载","need_search":false,"need_pro":false,"reason":"","short_label":"IPO路演中","impactWeight":20,"impactPersistenceDays":7,"impactConfidence":0.5,"impactRationale":"一句话说明持续影响","risk_flags":[],"evidence_sufficiency":0.5,"uncertainty":0.5,"deep_search_need":0.0,"deep_search_reason":""}}"""

TAVILY_PROMPT = """你是 Argus 情报系统的搜索增强模块。根据以下原始新闻和搜索结果，重新评估。

【原始新闻】
标题={title}｜来源={outlet}｜发布={published}

【搜索结果】
{evidence}

【任务】
综合原始新闻和搜索结果，输出 JSON：
{{"sentiment":0.0,"importance":0.0,"kind":"转载","status":"watch","note":"一句话结论","short_label":"2-5 words summary","impactWeight":20,"impactPersistenceDays":7,"impactConfidence":0.5,"impactRationale":"一句话说明持续影响"}}

严格只输出 JSON，无额外文字。
{lang_instruction}"""

PRO_SYSTEM_PROMPT = """你是 Argus 情报系统的「交叉验证分析员」(PRO)。原则：零幻觉，只认证据。

【输入】
- 监控成员：{name}（别名：{aliases}），所属领域：{domains}
- 事件：标题={title}｜来源={outlet}｜发布={published}
- BASE 初判：{base_json}
- 证据列表：
{evidence}

【最终判定】
1. sentiment：-1~1，综合证据后的最终情绪。
2. importance：0~1，校正 BASE 偏差。
3. kind：转载 | 官方一手 | 预告吹水。
4. status：confirmed(证实) | watch(证据不足/待观察) | refuted(被证伪/矛盾)。
5. rumor：0~1。多源一致且官方→低；单源/官方未证实/互相矛盾→高。
6. note：一句话中文结论，2-10 个字优先，用于 treemap 格子。
7. sources：实际支撑判断的来源链接数组。
8. impactWeight：0-100，持续影响力，不是一时热度。
9. impactPersistenceDays：影响半衰期天数；噪音约1，常规约7，重要约30，结构性约120+。
10. impactConfidence：0-1，持续影响力判断置信度。
11. impactRationale：一句话说明持续影响。

【规则】
- 只用证据列表和 BASE 初判判断，不臆测证据外事实。
- 证据不足→status=watch 且 rumor 偏高；证据矛盾→status=refuted。
- 与 BASE 不一致时以证据为准。
- 严格只输出下面 JSON，无任何额外文字。
- {lang_instruction}

【输出】
{{"sentiment":0.0,"importance":0.0,"kind":"官方一手","status":"watch","rumor":0.0,"note":"","sources":[],"impactWeight":20,"impactPersistenceDays":7,"impactConfidence":0.5,"impactRationale":"一句话说明持续影响"}}"""


# ── Helpers ──

def fingerprint(url: str, title: str) -> str:
    return hashlib.sha256(f"{url}|{title}".encode()).hexdigest()[:16]


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def safe_text(value: object, limit: int = 500) -> str:
    try:
        text = str(value)
    except Exception:
        text = repr(value)
    return text.encode("utf-8", errors="replace").decode("utf-8")[:limit]


def member_aliases(member: dict) -> list[str]:
    try:
        return json.loads(member["aliases"])
    except Exception:
        return []


def member_domains(conn, member_id: int) -> list[str]:
    rows = conn.execute(
        "SELECT d.label_zh FROM memberships m JOIN domains d ON d.key = m.domain "
        "WHERE m.member_id = ?", (member_id,)
    ).fetchall()
    return [r["label_zh"] for r in rows]


def matches_member(title: str, snippet: str, member: dict) -> bool:
    """Check if an RSS item mentions this member (word-boundary match)."""
    text = f"{title} {snippet}".lower()
    names = [member["name"].lower()]
    names.extend(a.lower() for a in member_aliases(member))
    if member["symbol"]:
        names.append(member["symbol"].lower())
    for n in names:
        # Chinese names: plain substring (no word boundary concept)
        if any(ord(c) > 0x7F for c in n):
            if n in text:
                return True
        # ASCII names: word-boundary match to avoid false positives
        elif re.search(r'\b' + re.escape(n) + r'\b', text):
            return True
    return False


# ── Model calls ──

def call_model(model_cfg: dict, system: str, user: str) -> dict:
    client = OpenAI(
        base_url=model_cfg["base_url"],
        api_key=model_cfg["api_key"],
        timeout=20,
    )
    resp = client.chat.completions.create(
        model=model_cfg["model"],
        messages=[
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        temperature=0.1,
        timeout=25,
    )
    text = resp.choices[0].message.content.strip()
    if "```" in text:
        text = text.split("```")[1]
        if text.startswith("json"):
            text = text[4:]
        text = text.strip()
    return json.loads(text)


# ── Time decay ──

MIN_MEMBER_INFLUENCE = 10
DEFAULT_BASELINE_INFLUENCE = 20.0
NEWS_HALF_LIFE_DAYS = 3.0
DEFAULT_IMPACT_PERSISTENCE_DAYS = 7.0


def clamp_float(value: object, low: float, high: float, default: float) -> float:
    try:
        n = float(value)
    except (TypeError, ValueError):
        n = default
    return max(low, min(high, n))


def time_decay(age_days: float) -> float:
    return 0.5 ** (age_days / NEWS_HALF_LIFE_DAYS)


def impact_decay(age_days: float, persistence_days: float) -> float:
    return 0.5 ** (age_days / max(persistence_days, 1.0))


def parse_dt(value: object) -> datetime | None:
    if not value:
        return None
    try:
        text = str(value).replace("Z", "+00:00")
        dt = datetime.fromisoformat(text)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(timezone.utc)
    except Exception:
        return None


def age_days(value: object, now: datetime | None = None) -> float:
    dt = parse_dt(value)
    if not dt:
        return 0.0
    ref = now or datetime.now(timezone.utc)
    return max(0.0, (ref - dt).total_seconds() / 86400)


def default_impact_weight(importance: object) -> float:
    return clamp_float(importance, 0.0, 1.0, 0.0) * 100.0


def default_persistence_days(importance: object) -> float:
    imp = clamp_float(importance, 0.0, 1.0, 0.0)
    if imp >= 0.8:
        return 120.0
    if imp >= 0.5:
        return 30.0
    if imp >= 0.2:
        return DEFAULT_IMPACT_PERSISTENCE_DAYS
    return 1.0


def event_status_factor(status: object) -> float:
    if status == "refuted":
        return 0.0
    if status == "watch":
        return 0.65
    return 1.0


def evidence_text_for_pro(item: dict, evidence: list[dict]) -> str:
    rows = evidence or [{
        "title": item["title"],
        "url": item["url"],
        "snippet": item["snippet"],
        "source": item["source_name"],
        "date": item["published"],
    }]
    lines = []
    for entry in rows:
        source = entry.get("source") or entry.get("outlet") or entry.get("title") or ""
        title = entry.get("title", "")
        url = entry.get("url", "")
        date = entry.get("date") or entry.get("published") or ""
        snippet = entry.get("snippet", "")
        lines.append(f"- 来源={source}｜标题={title}｜日期={date}｜链接={url}｜摘要={snippet}")
    return "\n".join(lines)


def normalize_status(value: object, default: str = "watch") -> str:
    text = str(value or "").strip()
    return text if text in {"confirmed", "watch", "refuted"} else default


# ── Snapshot builder ──

def build_snapshot(conn, prev_sentiment_map: dict[str, float] | None = None) -> dict:
    """Build treemap snapshot grouped by domain → member."""
    if prev_sentiment_map is None:
        prev_sentiment_map = {}
    domains = conn.execute("SELECT * FROM domains ORDER BY rowid").fetchall()
    now = datetime.now(timezone.utc)

    children = []
    for domain in domains:
        members = conn.execute(
            "SELECT mb.*, ms.role, ms.role_weight FROM memberships ms "
            "JOIN members mb ON mb.id = ms.member_id "
            "WHERE ms.domain = ? ORDER BY ms.role_weight DESC, mb.name",
            (domain["key"],),
        ).fetchall()

        member_children = []
        for member in members:
            baseline = clamp_float(
                member["baseline_influence"],
                0.0,
                100.0,
                DEFAULT_BASELINE_INFLUENCE,
            )
            role_weight = clamp_float(member["role_weight"], 0.0, 10.0, 1.0)
            events = conn.execute(
                "SELECT * FROM events WHERE member_id = ? "
                "ORDER BY COALESCE(last_seen, first_seen, published) DESC, importance DESC LIMIT 20",
                (member["id"],),
            ).fetchall()

            # Baseline is member existence/long-term stature. Events add slow-decaying influence.
            event_lift = 0.0
            weighted_sentiment = 0.0
            freshness = 0.0
            latest_headline = ""
            top_impact_weight = 0.0
            top_persistence_days = DEFAULT_IMPACT_PERSISTENCE_DAYS
            non_refuted_events = []

            for e in events:
                status_factor = event_status_factor(e["status"])
                if status_factor <= 0:
                    continue
                e_age = age_days(e["last_seen"] or e["published"], now)
                impact_weight = clamp_float(
                    e["impact_weight"],
                    0.0,
                    100.0,
                    default_impact_weight(e["importance"]),
                )
                persistence_days = clamp_float(
                    e["impact_persistence_days"],
                    1.0,
                    365.0,
                    default_persistence_days(e["importance"]),
                )
                contribution = impact_weight * impact_decay(e_age, persistence_days) * status_factor
                event_lift += contribution
                weighted_sentiment += (e["sentiment"] or 0) * contribution
                freshness = max(freshness, time_decay(e_age))
                non_refuted_events.append(e)
                if not latest_headline:
                    latest_headline = e["title"] or e["note"]
                if impact_weight > top_impact_weight:
                    top_impact_weight = impact_weight
                    top_persistence_days = persistence_days

            avg_sentiment = weighted_sentiment / event_lift if event_lift > 0 else 0
            influence = max(MIN_MEMBER_INFLUENCE, (baseline + event_lift) * role_weight)
            size = max(MIN_MEMBER_INFLUENCE, int(round(influence)))

            # Determine confidence status
            statuses = [e["status"] for e in non_refuted_events if e["status"]]
            if not statuses or all(s == "confirmed" for s in statuses):
                confidence = "confirmed"
            else:
                confidence = "watch"

            # Top related events for detail panel
            related = []
            for e in non_refuted_events[:5]:
                # Parse sources JSON from DB
                raw_sources = e["sources"] or "[]"
                try:
                    parsed_sources = json.loads(raw_sources) if isinstance(raw_sources, str) else raw_sources
                except (json.JSONDecodeError, TypeError):
                    parsed_sources = []
                related.append({
                    "title": e["title"],
                    "url": e["url"] or "",
                    "outlet": e["outlet"] or "",
                    "time": e["published"] or "",
                    "importance": e["importance"] or 0,
                    "impactWeight": (
                        e["impact_weight"]
                        if e["impact_weight"] is not None
                        else default_impact_weight(e["importance"])
                    ),
                    "impactPersistenceDays": (
                        e["impact_persistence_days"]
                        if e["impact_persistence_days"] is not None
                        else default_persistence_days(e["importance"])
                    ),
                    "kind": e["kind"] or "",
                    "note": e["note"] or "",
                    "sources": parsed_sources,
                })

            # Use the best short_label from events as metric
            best_note = ""
            for e in non_refuted_events:
                if e["note"] and len(e["note"]) <= 25:
                    best_note = e["note"]
                    break
            # Fallback: truncated headline
            if not best_note:
                best_note = latest_headline[:20] if latest_headline else "quiet"

            member_children.append({
                "name": member["name"],
                "size": size,
                "sentiment": round(avg_sentiment, 2),
                "previousSentiment": prev_sentiment_map.get(member["name"]),
                "headline": latest_headline,
                "metric": best_note or "quiet",
                "heat": min(freshness, 1.0),
                "freshness": round(min(freshness, 1.0), 4),
                "influence": round(influence, 2),
                "baselineInfluence": round(baseline, 2),
                "impactWeight": round(top_impact_weight, 2),
                "impactPersistenceDays": round(top_persistence_days, 2),
                "confidence": confidence,
                "status": confidence,
                "related": related,
            })

        if member_children:
            member_children.sort(key=lambda item: item["size"], reverse=True)
            children.append({
                "name": domain["label_zh"] + " " + (domain["label_en"] or ""),
                "key": domain["key"],
                "weight": domain["weight"],
                "children": member_children,
            })

    return {
        "name": "watchlist",
        "generated": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
        "children": children,
    }


# ── Health writer ──

def write_health(conn, module: str, status: str, error: str | None = None):
    now = now_iso()
    safe_error = safe_text(error) if error else None
    conn.execute(
        "INSERT INTO health (module, status, last_ok, last_error, updated_at) "
        "VALUES (?, ?, ?, ?, ?) "
        "ON CONFLICT(module) DO UPDATE SET "
        "status=excluded.status, last_ok=CASE WHEN excluded.status='ok' THEN excluded.last_ok ELSE health.last_ok END, "
        "last_error=excluded.last_error, updated_at=excluded.updated_at",
        (module, status, now if status == "ok" else None, safe_error, now),
    )
    conn.commit()


# ── Main pipeline ──

def run_pipeline(db_path: str | None = None):
    conn = init_db(db_path)
    now = now_iso()
    _update_progress(running=True, step="rss", started_at=now, members_done=0, events_found=0)

    # Read config
    tavily_enabled = get_setting(conn, "tavily_enabled", "false") == "true"
    pro_enabled = get_setting(conn, "pro_enabled", "false") == "true"
    language = get_setting(conn, "language", "zh")

    LANG_INSTRUCTION = {
        "zh": "所有输出文字（short_label, note, reason, impactRationale）必须用中文。",
        "en": "All text output (short_label, note, reason, impactRationale) must be in English.",
    }
    lang_instruction = LANG_INSTRUCTION.get(language, LANG_INSTRUCTION["zh"])

    # Read models
    base_model = get_model_for_role(conn, "base")
    if not base_model:
        print("ERROR: No base model configured. Run seed.py first.")
        write_health(conn, "pipeline", "failed", "No base model")
        conn.commit()
        _update_progress(running=False, step="idle")
        conn.close()
        return

    pro_model = get_model_for_role(conn, "pro") if pro_enabled else None

    # Read members + sources
    members = conn.execute("SELECT * FROM members").fetchall()
    sources = conn.execute("SELECT * FROM sources").fetchall()

    if not members:
        print("ERROR: No members configured. Run seed.py first.")
        write_health(conn, "pipeline", "failed", "No members")
        conn.commit()
        _update_progress(running=False, step="idle")
        conn.close()
        return

    print(f"Pipeline: {len(members)} members, {len(sources)} sources")
    print(f"  base_model: {base_model['label']} ({base_model['model']})")
    print(f"  tavily: {'on' if tavily_enabled else 'off'}, pro: {'on' if pro_enabled else 'off'}")

    # Fetch all RSS items
    _update_progress(rss_sources_total=len(sources), rss_sources_done=0)
    all_items: list[dict] = []
    for i, source in enumerate(sources):
        src = dict(source)
        _update_progress(rss_sources_done=i)
        try:
            feed = feedparser.parse(src["url"])
            # Extract feed logo if we don't have one yet
            if not src.get("logo_url"):
                feed_meta = feed.feed
                logo = (
                    (feed_meta.get("image") or {}).get("href")
                    or feed_meta.get("icon")
                    or feed_meta.get("logo")
                )
                if logo:
                    conn.execute("UPDATE sources SET logo_url = ? WHERE id = ?", (logo, src["id"]))
                    src["logo_url"] = logo
            for entry in feed.entries[:30]:
                all_items.append({
                    "title": entry.get("title", ""),
                    "url": entry.get("link", ""),
                    "published": entry.get("published", ""),
                    "snippet": entry.get("summary", "")[:300],
                    "source_name": src["name"],
                    "source_id": src["id"],
                    "source_logo": src.get("logo_url", ""),
                })
            write_health(conn, "rss", "ok")
        except Exception as e:
            print(f"  RSS error ({safe_text(src['name'])}): {safe_text(e)}")
            write_health(conn, "rss", "degraded", safe_text(e))
    _update_progress(rss_sources_done=len(sources))

    print(f"  Fetched {len(all_items)} RSS items total")

    # ── Discovery search per member ──
    ai_search_enabled = get_setting(conn, "ai_search_enabled", "true") == "true"
    ai_search_max = int(get_setting(conn, "ai_search_max_results", "5"))

    if ai_search_enabled:
        _update_progress(step="searching", search_done=0, search_total=len(members))
        print(f"  Discovery search: enabled (max {ai_search_max} results/member)")
        discovery_router = SearchRouter(conn, profile="discovery")
        for member in members:
            mb = dict(member)
            try:
                response = discovery_router.discovery(
                    mb["name"], max_results=ai_search_max, member_id=str(mb["id"]),
                )
                for sr in response.results:
                    all_items.append({
                        "title": sr.title,
                        "url": sr.url,
                        "published": sr.published or "",
                        "snippet": sr.snippet,
                        "source_name": sr.outlet or "Web Search",
                        "source_id": 0,
                        "source_logo": "",
                        "_source": "discovery",
                    })
                print(f"    {mb['name']}: {len(response.results)} discovery results")
            except Exception as e:
                print(f"    {mb['name']} discovery error: {safe_text(e)}")
            _update_progress(search_done=_pipeline_progress["search_done"] + 1)
    else:
        print("  Discovery search: disabled")

    total_kept = 0
    total_dropped = 0

    # ── Phase 1: Pre-filter + deduplicate per member (main thread, needs DB) ──
    work_queue: list[tuple[int, dict, list, str, str]] = []  # (idx, mb, new_items, aliases, domains)
    members_progress: list[dict] = []
    for member_idx, member in enumerate(members):
        mb = dict(member)
        domains_list = member_domains(conn, mb["id"])
        domain_str = ", ".join(domains_list) if domains_list else ""
        aliases_str = ", ".join(member_aliases(mb))
        domains_str = domain_str

        members_progress.append({
            "name": mb["name"],
            "domain": domain_str,
            "status": "pending",
            "events": 0,
            "log": "",
        })

        matching = [item for item in all_items if matches_member(item["title"], item["snippet"], mb)]
        if not matching:
            members_progress[-1]["status"] = "done"
            members_progress[-1]["log"] = "0 matching items"
            continue

        new_items = []
        for item in matching:
            fp = fingerprint(item["url"], item["title"])
            exists = conn.execute("SELECT id FROM events WHERE fingerprint = ?", (fp,)).fetchone()
            if not exists:
                new_items.append(item)

        if not new_items:
            members_progress[-1]["status"] = "done"
            members_progress[-1]["log"] = f"0 new (of {len(matching)})"
            continue

        work_queue.append((member_idx, mb, new_items[:10], aliases_str, domains_str))

    _update_progress(step="analyzing", members_total=len(members), members_done=0, members=members_progress)

    # ── Phase 2: Concurrent AI processing (workers return event dicts, no DB writes) ──
    from concurrent.futures import ThreadPoolExecutor, as_completed

    def _process_member_work(idx: int, mb: dict, items: list, aliases_str: str, domains_str: str, router_factory=None) -> list[dict]:
        """Process one member's items. Returns list of event dicts to insert."""
        _update_member_status(idx, "running")
        results = []
        for item in items:
            fp = fingerprint(item["url"], item["title"])
            try:
                system = BASE_SYSTEM_PROMPT.format(
                    name=mb["name"], aliases=aliases_str, domains=domains_str,
                    lang_instruction=lang_instruction,
                )
                user_msg = f"标题={item['title']}｜来源={item['source_name']}｜发布={item['published']}｜摘要={item['snippet']}"
                result = call_model(base_model, system, user_msg)

                sentiment = result.get("sentiment", 0)
                importance = result.get("importance", 0)
                impact_weight = clamp_float(result.get("impactWeight", result.get("impact_weight")), 0.0, 100.0, default_impact_weight(importance))
                impact_persistence_days = clamp_float(result.get("impactPersistenceDays", result.get("impact_persistence_days")), 1.0, 365.0, default_persistence_days(importance))
                impact_confidence = clamp_float(result.get("impactConfidence", result.get("impact_confidence")), 0.0, 1.0, 0.5)
                impact_rationale = result.get("impactRationale", result.get("impact_rationale", ""))
                kind = result.get("kind", "转载")
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
                member_tier = "primary"  # TODO: read from member when tier system added
                policy_decision = should_deep_search(
                    item, result, search_policy,
                    budget_remaining=_get_deep_budget(),
                    member_tier=member_tier,
                )
                if policy_decision.should_search and tavily_enabled and router_factory:
                    _consume_deep_budget()
                    local_router = router_factory()
                    sr_response = local_router.deep(
                        f"{mb['name']} {item['title']}", max_results=3, member_id=str(mb["id"]),
                    )
                    evidence = [r.to_dict() for r in sr_response.results] if sr_response.results else []
                    if evidence:
                        search_evidence = evidence
                        evidence_text = "\n".join(f"- {e['title']} ({e['url']}): {e['snippet']}" for e in evidence)
                        enhanced = call_model(base_model, TAVILY_PROMPT.format(
                            title=item["title"], outlet=item["source_name"], published=item["published"],
                            evidence=evidence_text, lang_instruction=lang_instruction,
                        ), "")
                        sentiment = enhanced.get("sentiment", sentiment)
                        importance = enhanced.get("importance", importance)
                        impact_weight = clamp_float(enhanced.get("impactWeight", enhanced.get("impact_weight")), 0.0, 100.0, impact_weight)
                        impact_persistence_days = clamp_float(enhanced.get("impactPersistenceDays", enhanced.get("impact_persistence_days")), 1.0, 365.0, impact_persistence_days)
                        impact_confidence = clamp_float(enhanced.get("impactConfidence", enhanced.get("impact_confidence")), 0.0, 1.0, impact_confidence)
                        impact_rationale = enhanced.get("impactRationale", enhanced.get("impact_rationale", impact_rationale))
                        kind = enhanced.get("kind", kind)
                        status = enhanced.get("status", "watch")
                        enhanced_label = enhanced.get("short_label", "")
                        if enhanced_label and enhanced_label != reason and len(enhanced_label) <= 25:
                            short_label = enhanced_label
                        supporting_sources = [e.get("url") or e.get("title", "") for e in evidence if e.get("url") or e.get("title")] or supporting_sources
                        reason = f"search: {reason}"

                # Pro cross-validation
                if need_pro and pro_model and pro_enabled:
                    try:
                        base_json = json.dumps({
                            "sentiment": sentiment, "importance": importance, "kind": kind, "status": status,
                            "short_label": short_label, "impactWeight": impact_weight,
                            "impactPersistenceDays": impact_persistence_days, "impactConfidence": impact_confidence,
                            "impactRationale": impact_rationale, "reason": reason,
                        }, ensure_ascii=False)
                        pro_result = call_model(pro_model, PRO_SYSTEM_PROMPT.format(
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
                results.append({
                    "fingerprint": fp, "member_id": mb["id"], "title": item["title"],
                    "url": item["url"], "outlet": item["source_name"], "published": item["published"],
                    "sentiment": sentiment, "importance": importance, "impact_weight": impact_weight,
                    "impact_persistence_days": impact_persistence_days, "impact_confidence": impact_confidence,
                    "impact_rationale": impact_rationale, "kind": kind, "status": status,
                    "note": short_label, "rumor": rumor,
                    "sources": json.dumps(supporting_sources, ensure_ascii=False),
                    "need_pro": 1 if need_pro else 0, "route_reason": f"{reason}{policy_info}",
                })
            except Exception as e:
                print(f"    {mb['name']} error: {safe_text(e)}")
        return results

    # Run with max 5 concurrent workers
    all_events: list[dict] = []
    search_policy = PolicyConfig.from_settings(conn)

    # Deep search budget (thread-safe counter)
    deep_search_cap = 30  # default daily cap for deep search
    deep_search_count = [0]  # mutable container for thread-safe access
    deep_search_lock = threading.Lock()

    def _make_router():
        return SearchRouter(get_db(db_path), profile="deep")

    def _get_deep_budget():
        with deep_search_lock:
            return max(0, deep_search_cap - deep_search_count[0])

    def _consume_deep_budget():
        with deep_search_lock:
            deep_search_count[0] += 1

    with ThreadPoolExecutor(max_workers=5) as pool:
        futures = {
            pool.submit(_process_member_work, idx, mb, items, aliases, domains, _make_router): idx
            for idx, mb, items, aliases, domains in work_queue
        }
        for future in as_completed(futures):
            idx = futures[future]
            try:
                events = future.result()
                all_events.extend(events)
                _update_member_status(idx, "done", events=len(events), log=f"{len(events)} events")
                _update_progress(events_found=_pipeline_progress["events_found"] + len(events))
            except Exception as e:
                _update_member_status(idx, "failed", log=safe_text(e, 80))
                print(f"  Member failed: {e}")

    # ── Phase 3: Batch flush all events to SQLite (main thread) ──
    for ev in all_events:
        conn.execute(
            "INSERT INTO events (fingerprint, member_id, title, url, outlet, published, "
            "sentiment, importance, impact_weight, impact_persistence_days, "
            "impact_confidence, impact_rationale, kind, status, note, rumor, sources, need_pro, "
            "route_reason, first_seen, last_seen) "
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) "
            "ON CONFLICT(fingerprint) DO UPDATE SET "
            "sentiment=excluded.sentiment, importance=excluded.importance, "
            "impact_weight=excluded.impact_weight, "
            "impact_persistence_days=excluded.impact_persistence_days, "
            "impact_confidence=excluded.impact_confidence, "
            "impact_rationale=excluded.impact_rationale, "
            "kind=excluded.kind, status=excluded.status, note=excluded.note, "
            "sources=excluded.sources, rumor=excluded.rumor, "
            "route_reason=excluded.route_reason, "
            "last_seen=excluded.last_seen",
            (
                ev["fingerprint"], ev["member_id"], ev["title"], ev["url"], ev["outlet"],
                ev["published"], ev["sentiment"], ev["importance"], ev["impact_weight"],
                ev["impact_persistence_days"], ev["impact_confidence"], ev["impact_rationale"],
                ev["kind"], ev["status"], ev["note"], ev["rumor"], ev["sources"],
                ev["need_pro"], ev["route_reason"], now, now,
            ),
        )
        total_kept += 1
    conn.commit()
    print(f"\n  Flushed {total_kept} events to DB")

    # Write consolidated health
    write_health(conn, "base_model", "ok")
    if pro_model:
        write_health(conn, "pro_model", "ok")
    for row in conn.execute("SELECT name FROM search_providers WHERE enabled = 1").fetchall():
        write_health(conn, f"search_{row['name']}", "ok")
    write_health(conn, "pipeline", "ok")

    # Build snapshot (read previous for sentiment history)
    _update_progress(step="snapshot")
    try:
        prev_sentiment_map: dict[str, float] = {}
        try:
            row = conn.execute("SELECT doc FROM snapshot WHERE id = 'latest'").fetchone()
            if row:
                old = json.loads(row["doc"])
                for group in old.get("children", []):
                    for m in group.get("children", []):
                        if m.get("name") and m.get("sentiment") is not None:
                            prev_sentiment_map[m["name"]] = m["sentiment"]
        except Exception:
            pass
        snapshot = build_snapshot(conn, prev_sentiment_map)
        conn.execute(
            "INSERT INTO snapshot (id, doc, generated) VALUES ('latest', ?, ?) "
            "ON CONFLICT(id) DO UPDATE SET doc=excluded.doc, generated=excluded.generated",
            (json.dumps(snapshot, ensure_ascii=False), now),
        )
        write_health(conn, "pipeline", "ok")
    except Exception as e:
        print(f"Snapshot error: {safe_text(e)}")
        write_health(conn, "pipeline", "failed", safe_text(e))
        traceback.print_exc()

    conn.commit()
    _update_progress(running=False, step="idle", current_member="", current_domain="")
    print(f"\nDone. Kept: {total_kept}, Dropped: {total_dropped}")
    conn.close()


if __name__ == "__main__":
    run_pipeline()
