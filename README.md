# Argus

**Ambient information radar for tech intelligence workers.**

AI-powered news filtering that compresses the flood of tech news into just the most important items. Glance at it 5-10 times a day, 30 seconds each, and you're caught up.

## Features

- **AI Subtraction** — Keep/drop decisions + one-sentence summaries, not full analysis
- **Treemap Dashboard** — Sentiment-colored, heat-weighted visualization of your watchlist
- **Live Feed** — RSS + AI-filtered news stream with importance scoring
- **Multi-language** — Chinese/English bilingual UI
- **Ambient Design** — Wall-mountable, glanceable, zero-animation idle states
- **Self-hosted** — Your data stays on your machine

## Quick Start

### Prerequisites

- Python 3.12+ & Node.js 18+ (for local development)
- **Or** Docker (for production deployment)
- An OpenAI-compatible API key (e.g. OpenAI, Mimo, DeepSeek)

### 1. Clone & Install

```bash
git clone https://github.com/Ezri-Lin/Argus.git
cd Argus

# Backend
pip install -r pipeline/requirements.txt

# Frontend
cd web && npm install && cd ..
```

### 2. Configure

```bash
cp .env.example .env
```

Edit `.env` and fill in your API key:

```env
ARGUS_MODEL_BASE_URL=https://api.openai.com/v1
ARGUS_MODEL_API_KEY=sk-your-key-here
ARGUS_MODEL_NAME=gpt-4o-mini
```

### 3. Seed & Run

```bash
# Initialize the database with example watchlist
cp pipeline/watchlist.example.json pipeline/watchlist.json
python pipeline/seed.py

# Start both backend and frontend
./dev.sh
```

Open `http://localhost:5173` in your browser.

## Customization

### Watchlist

Edit `pipeline/watchlist.json` to add your own entities:

```json
{
  "members": [
    { "name": "Your Company", "domains": ["tech"], "aliases": ["alias1"] }
  ],
  "domains": [
    { "key": "tech", "label_zh": "科技", "label_en": "Tech", "weight": 1.0 }
  ]
}
```

Then re-seed: `python pipeline/seed.py`

### RSS Sources

Add feeds in the Sources panel (Settings) or edit `pipeline/sources.json`.

### AI Models

Configure models in Settings → Config. Supports any OpenAI-compatible API.

## Architecture

```
pipeline/          # RSS → AI filter → events → snapshot
  pipeline.py      # Core pipeline (single file, MVP)
  db.py            # SQLite schema + migrations
  seed.py          # Database seeder

api/               # FastAPI server
  api.py           # Core endpoints (/data, /layout, /health)
  routes_ai.py     # AI model management
  routes_members.py # Watchlist CRUD
  routes_sources.py # RSS source management
  scheduler.py     # Background task scheduler

web/               # React + Vite + D3 treemap
  src/
    widgets/       # Treemap, feed, stat, countdown, etc.
    components/    # Detail panel, config panel, settings
    dashboard/     # Zustand store, API client, types
    design/        # Tokens, grid, typography
    lib/           # i18n, theme, utilities
```

## Self-hosted search with SearXNG

Argus can optionally run SearXNG as a local metasearch sidecar for low-cost discovery search.

Start with:

```bash
docker compose --profile search up -d
```

If you already have a SearXNG instance:

```bash
SEARXNG_BASE_URL=https://your-search.example.com
```

SearXNG is an independent open-source project licensed under AGPL-3.0. Argus runs the official container image by default and does not modify SearXNG source code. Do not expose your SearXNG instance publicly without authentication and rate limiting.

## RSS intelligence engine

- Preloaded official/news/research sources are enabled by default.
- Articles are cached locally in SQLite.
- Local matching uses full title/snippet/content relevance, not title-only matching.
- Backend automatically discovers official feeds for newly added members.
- Users normally only configure domains and members.

## Deployment

### Docker (Recommended)

The easiest way to run Argus in production — no Python/Node.js installation required.

```bash
# 1. Clone & configure
git clone https://github.com/Ezri-Lin/Argus.git && cd Argus
cp .env.example .env
# Edit .env — at minimum set ARGUS_MODEL_API_KEY

# 2. Prepare watchlist (optional, for auto-seed on first run)
cp pipeline/watchlist.example.json pipeline/watchlist.json

# 3. Build & start
docker compose up -d

# 4. Open http://localhost:8000
```

**Update:**

```bash
docker compose down
git pull
docker compose build --no-cache
docker compose up -d
```

**Data persistence:** SQLite + config stored in Docker volume `argus-data`. To use a local directory instead (easier backup), edit `docker-compose.yml`:

```yaml
volumes:
  - ./data:/app/data
```

### Local Development

```bash
./dev.sh
# Backend: http://localhost:8000
# Frontend: http://localhost:5173
```

### Static Host

Build the frontend and deploy to Vercel, Cloudflare Pages, etc.:

```bash
cd web && npm run build
# Output: web/dist/
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, D3, Zustand, Tailwind CSS |
| Backend | Python, FastAPI, SQLite (WAL) |
| AI | OpenAI-compatible API (configurable) |
| Pipeline | RSS parsing → AI filtering → event extraction |

## License

MIT
