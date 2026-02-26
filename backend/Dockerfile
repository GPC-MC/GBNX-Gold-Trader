FROM ghcr.io/astral-sh/uv:python3.11-bookworm

WORKDIR /data

# Runtime environment variables
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    UV_LINK_MODE=copy \
    PATH="/data/.venv/bin:${PATH}" \
    PYTHONPATH=/data

# Copy dependency files first for better layer caching
COPY pyproject.toml uv.lock ./

# Install Python dependencies.
# TMPDIR is set to /data/tmp (overlay-backed by /data/docker) so that large
# package extractions (e.g. torch ~2 GB) do NOT go to the BuildKit tmpfs at
# /tmp, which is backed by RAM/root-disk and too small.
# The temp dir is cleaned up at the end so it doesn't bloat the image layer.
RUN mkdir -p /data/tmp && \
    TMPDIR=/data/tmp uv venv /data/.venv && \
    TMPDIR=/data/tmp uv pip install --no-cache -e . && \
    rm -rf /data/tmp && \
    /data/.venv/bin/python --version && \
    /data/.venv/bin/python -c "import uvicorn; print(f'uvicorn {uvicorn.__version__}')"

# Copy application code
COPY src ./src
COPY main.py ./main.py

# Copy .env file (will be in the image, can also mount via volume)
COPY .env ./.env

# Create runtime directories
RUN mkdir -p /data/logs /data/cache /data/uploads && \
    chmod -R 777 /data/logs /data/cache /data/uploads

EXPOSE 8081

HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD curl -fsS http://127.0.0.1:8081/ || exit 1

CMD ["/data/.venv/bin/python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8081"]
