# Use the base image with uv and Python 3.12 (align comment + tag)
FROM ghcr.io/astral-sh/uv:python3.12-bookworm

WORKDIR /app

# ---- System deps (use BuildKit cache mounts) ----
RUN --mount=type=cache,target=/var/cache/apt \
    --mount=type=cache,target=/var/lib/apt \
    apt-get update \
 && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ca-certificates curl gnupg git \
    gcc g++ make pkg-config python3-dev \
    libfreetype6-dev libpng-dev \
    portaudio19-dev libportaudio2 libasound2-dev \
    ffmpeg \
    curl \
    redis-server openssh-server cron \
 && rm -rf /var/lib/apt/lists/*

# ---- Node.js 20 (only if you actually need it at runtime) ----
RUN curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
 && apt-get install -y --no-install-recommends nodejs \
 && node -v && npm -v && npx --version

# ---- Python deps (cache uv to avoid rebuilding wheels) ----
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv \
    uv sync --frozen --no-dev

# ---- App code last for better caching ----
COPY . .

# ---- Logs dir ----
RUN mkdir -p logs && chmod 777 logs

# ---- Env / PATH ----
ENV PYTHONPATH=. \
    PATH="/app/.venv/bin:${PATH}"

EXPOSE ${PORT:-3035}

# Add health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD curl -f http://localhost:${PORT:-3035}/ || exit 1

# TIP: install uvicorn[standard] in your pyproject for uvloop+httptools speedup
# Start Redis in the same container (dev-friendly) and run the app with faster stack
CMD ["sh", "-c", "redis-server --daemonize yes && uv run python -m uvicorn src.main:app --host 0.0.0.0 --port ${PORT:-3035} --reload"]

