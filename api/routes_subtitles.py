"""Subtitle translation endpoint."""

import json
import os
import sys
from pathlib import Path

from fastapi import APIRouter
from pydantic import BaseModel

sys.path.insert(0, str(Path(__file__).parent.parent / "pipeline"))
from db import get_db, get_model_for_role, get_setting

from .ai_helpers import _call_model, _safe_text

router = APIRouter(prefix="/ai", tags=["ai"])


def _translate_cues(cues: list[dict], target_lang: str, model_cfg: dict) -> list[dict]:
    """Translate a batch of subtitle cues via LLM. Returns cues with translated text."""
    if not cues:
        return cues

    # Build a compact prompt: numbered lines for alignment
    lines = [f"[{i}] {c['text']}" for i, c in enumerate(cues)]
    joined = "\n".join(lines)

    system = f"""You are a subtitle translator. Translate each numbered line to {target_lang}.
Rules:
- Keep the same numbering format [0], [1], etc.
- Translate naturally, not word-for-word
- Keep it concise (subtitle-sized)
- If a line is already in {target_lang}, keep it unchanged
- Output ONLY the translated lines, one per line, same numbering"""

    raw = _call_model(model_cfg, system, joined)

    # Parse numbered lines back
    translations: dict[int, str] = {}
    for line in raw.strip().splitlines():
        line = line.strip()
        if not line:
            continue
        # Match [N] text
        if line.startswith("["):
            try:
                bracket_end = line.index("]")
                idx = int(line[1:bracket_end])
                text = line[bracket_end + 1:].strip()
                if text:
                    translations[idx] = text
            except (ValueError, IndexError):
                continue

    # Apply translations
    result = []
    for i, c in enumerate(cues):
        translated = translations.get(i, c["text"])
        result.append({**c, "translated": translated})

    return result


class TranslateSubtitlesRequest(BaseModel):
    cues: list[dict]  # [{startTime, endTime, text}, ...]
    target_lang: str = "zh"


@router.post("/translate-subtitles")
def translate_subtitles(body: TranslateSubtitlesRequest):
    conn = get_db(os.environ.get("ARGUS_DB_PATH", "data/argus.db"))
    model = get_model_for_role(conn, "base")
    conn.close()

    if not model:
        return {"ok": False, "error": "No base model configured"}

    if not body.cues:
        return {"ok": True, "cues": []}

    try:
        # Batch in chunks of 30 to keep prompt manageable
        result = []
        for i in range(0, len(body.cues), 30):
            chunk = body.cues[i:i + 30]
            translated = _translate_cues(chunk, body.target_lang, model)
            result.extend(translated)
        return {"ok": True, "cues": result}
    except Exception as e:
        return {"ok": False, "error": _safe_text(e)}
