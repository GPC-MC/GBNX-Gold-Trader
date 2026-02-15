FROM ghcr.io/astral-sh/uv:python3.11-bookworm

WORKDIR /data

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    PATH="/data/.venv/bin:${PATH}" \
    PYTHONPATH=/data

# System dependencies commonly needed by Python packages in this project
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
       build-essential \
       libpq-dev \
       curl \
    && rm -rf /var/lib/apt/lists/*

# Install dependencies first for better layer caching
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev

# Copy application code
COPY src ./src
COPY main.py ./main.py

# Create all necessary directories under /data
RUN mkdir -p /data/logs /data/cache /data/uploads /data/temp && \
    chmod -R 777 /data/logs /data/cache /data/uploads /data/temp

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8081/ || exit 1

CMD ["uv", "run", "python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8081"]
