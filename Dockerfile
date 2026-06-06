# ── Stage 1: Build frontend ──
FROM node:20-alpine AS frontend-build
WORKDIR /app/web
COPY web/package.json web/package-lock.json ./
RUN npm ci
COPY web/ ./
RUN npm run build

# ── Stage 2: Python runtime ──
FROM python:3.12-slim
WORKDIR /app

# System deps for yt-dlp (video extraction)
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Python dependencies
COPY pipeline/requirements.txt ./pipeline/requirements.txt
RUN pip install --no-cache-dir -r pipeline/requirements.txt

# Application code
COPY api/ ./api/
COPY pipeline/ ./pipeline/
COPY web/dist/ ./web/dist/
COPY docker-entrypoint.sh ./
RUN chmod +x docker-entrypoint.sh

# Persistent data mount point
RUN mkdir -p /app/data

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["python", "-m", "uvicorn", "api.api:app", "--host", "0.0.0.0", "--port", "8000"]
