FROM ghcr.io/astral-sh/uv:python3.11-bookworm

WORKDIR /data

# Environment variables for Python
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    PATH="/data/.venv/bin:${PATH}" \
    PYTHONPATH=/data

# Install system dependencies
# Fix GPG key issues first
RUN apt-get clean && \
    rm -rf /var/lib/apt/lists/* && \
    apt-get update --allow-insecure-repositories || true && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --allow-unauthenticated \
       debian-archive-keyring \
       ca-certificates && \
    apt-get update && \
    DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       build-essential \
       libpq-dev \
       curl && \
    rm -rf /var/lib/apt/lists/*

# Copy dependency files first for better layer caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies (no cache to avoid BuildKit requirement)
RUN uv sync --frozen --no-dev --no-cache && \
    ls -la /data/.venv/bin/ && \
    /data/.venv/bin/python --version

# Copy application code
COPY src ./src
COPY main.py ./main.py

# Copy .env file (will be in the image, can also mount via volume)
COPY .env ./.env

# Create all necessary directories under /data
RUN mkdir -p /data/logs /data/cache /data/uploads /data/temp && \
    chmod -R 777 /data/logs /data/cache /data/uploads /data/temp

# Expose the application port
EXPOSE 8081

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8081/ || exit 1

# Run the application directly from venv
CMD ["/data/.venv/bin/uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8081"]
