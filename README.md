<p align="center">
  <img src="argus_logo.png" alt="Argus" width="180" />
</p>

<h1 align="center">Argus</h1>

<p align="center">
  <strong>Ambient information radar for tech intelligence workers</strong><br/>
  <em>AI-powered news filtering that compresses the flood of tech news into just the most important items.</em><br/>
  Glance at it 5–10 times a day, 30 seconds each, and you're caught up.
</p>

<p align="center">
  <a href="README.md">English</a> | <a href="README_CN.md">中文</a>
</p>

---

## Features

- **AI Subtraction** — Keep/drop decisions + one-sentence summaries, no lengthy analysis
- **Treemap Dashboard** — Sentiment-colored, heat-weighted treemap visualization
- **Real-time Feed** — RSS + AI-filtered news stream with importance scoring
- **Domain Presets** — One-click domain presets (AI, Chips, Crypto, Finance, etc.)
- **Video Player** — HLS/MP4 playback, automatic subtitle track detection, LLM-powered subtitle translation
- **Countdown** — Browser-local timezone, AI date suggestions
- **Weather / Clock / Search** — Practical utility widgets
- **Bilingual UI** — Full Chinese/English interface switching
- **Ambient Design** — Wall-mountable, glanceable, zero-animation idle states
- **Self-hosted** — Your data stays on your machine

## Quick Start

### Prerequisites

- **Docker** (recommended, no Python/Node.js needed)
- Or Python 3.12+ & Node.js 18+ (local dev)
- An OpenAI-compatible API key (OpenAI / Mimo / DeepSeek, etc.)

### Docker Deployment (Recommended)

```bash
git clone https://github.com/Ezri-Lin/Argus.git && cd Argus
cp .env.example .env
# Edit .env and fill in ARGUS_MODEL_API_KEY (optional — can also configure in Settings UI after launch)
docker compose up -d
```

Open http://localhost:8000 — the frontend is served by the backend (FastAPI serves `web/dist/`), no separate port needed.

First launch auto-initializes the database and example watchlist.

### Local Development

```bash
git clone https://github.com/Ezri-Lin/Argus.git && cd Argus
pip install -r pipeline/requirements.txt
cd web && npm install && cd ..
cp .env.example .env  # optional
./dev.sh
```

- Backend: `http://localhost:8000`
- Frontend: `http://localhost:5173`

## Widgets

| Widget | Description |
|--------|-------------|
| **Treemap** | Heatmap-style watchlist, sentiment-colored, click for details |
| **Feed** | Real-time news stream, AI-scored, signal/timeline views |
| **Stat** | Numeric indicator cards with trend display |
| **Countdown** | Countdown component, browser-local timezone, AI date suggestions |
| **Weather** | Weather display |
| **Clock** | Multi-timezone clock |
| **Search** | Search component |
| **Embed** | Video/live stream player, HLS/MP4/iframe, automatic subtitle detection + translation |

## Domain Presets

One-click preconfigured watchlists with domain semantic context and recommended members:

- **AI & LLM** — NVIDIA, OpenAI, Anthropic, DeepMind, Meta AI ...
- **Big Tech** — Apple, Microsoft, Google, Amazon, Meta ...
- **Chips & Semiconductors** — TSMC, ASML, Samsung, Intel, AMD ...
- **Crypto** — Bitcoin, Ethereum, Solana, Coinbase ...
- **Finance** — JPMorgan, Goldman Sachs, BlackRock ...
- **China Tech** — Tencent, Alibaba, BYD, ByteDance ...
- **New Energy** — Tesla, BYD, CATL, Rivian ...

Each preset includes primary/secondary member tiers and domain search intent.

## Architecture

```
pipeline/              # RSS → AI filtering → event extraction → snapshot
  pipeline.py          # Core pipeline orchestration
  db.py                # SQLite schema + migrations
  models.py            # AI model calls + system prompts
  processing.py        # News processing + deduplication
  scheduling.py        # Member scan scheduling
  snapshot.py          # Treemap snapshot builder
  search/              # Search routing + SearXNG integration

api/                   # FastAPI server
  api.py               # Core endpoints + route registration
  routes_ai.py         # AI model management
  routes_members.py    # Watchlist CRUD + domain management
  routes_sources.py    # RSS source management
  routes_dates.py      # AI date suggestions
  routes_video.py      # Video parsing + stream proxy
  routes_subtitles.py  # Subtitle translation
  routes_widgets.py    # Widget config persistence
  scheduler.py         # Background task scheduling

web/                   # React + Vite + D3 treemap
  src/
    widgets/           # Treemap, Feed, Countdown, Embed components
    components/        # Config panels, detail panels, settings
    dashboard/         # Zustand store, API client, type definitions
    design/            # Design tokens, grid, typography
    lib/               # i18n, theme, utilities
```

## Self-hosted Search

Argus can optionally run SearXNG as a local meta-search sidecar:

```bash
docker compose --profile search up -d
```

Already have a SearXNG instance? Set the environment variable:
```bash
SEARXNG_BASE_URL=https://your-search.example.com
```

## Update

```bash
docker compose down
git pull
docker compose build --no-cache
docker compose up -d
```

## Data Persistence

SQLite database and config are stored in Docker volume `argus-data`. To use a local directory (for easy backup), edit `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data
```

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | React, Vite, D3, Zustand, Tailwind CSS |
| Backend | Python, FastAPI, SQLite (WAL) |
| AI | OpenAI-compatible API (configurable) |
| Pipeline | RSS → AI filtering → event extraction → snapshot |
| Search | SearXNG (optional) + Web search APIs |

## License

MIT
