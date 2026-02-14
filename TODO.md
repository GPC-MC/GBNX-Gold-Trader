# Frontend
Make navigation bar more concise
- delete techincal analysis
- delete order book
- make chart better

 => CACHED [stage-0 3/9] RUN apt-get update     && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends        b  0.0s
 => CACHED [stage-0 4/9] COPY pyproject.toml uv.lock ./                                                                                0.0s
 => ERROR [stage-0 5/9] RUN --mount=type=cache,target=/root/.cache/uv     uv sync --frozen --no-dev                                   55.8s
------                                                                                                                                      
 > [stage-0 5/9] RUN --mount=type=cache,target=/root/.cache/uv     uv sync --frozen --no-dev:                                               
0.519 Downloading cpython-3.11.3-linux-x86_64-gnu (download) (27.6MiB)                                                                      
1.263  Downloaded cpython-3.11.3-linux-x86_64-gnu (download)                                                                                
1.443 Using CPython 3.11.3                                                                                                                  
1.443 Creating virtual environment at: .venv                                                                                                
1.521 Downloading nvidia-cusolver-cu12 (255.1MiB)
1.523 Downloading nvidia-cublas-cu12 (566.8MiB)
1.544 Downloading nvidia-cusparselt-cu12 (273.9MiB)
1.544 Downloading nvidia-cudnn-cu12 (674.0MiB)
1.545 Downloading nvidia-nccl-cu12 (307.4MiB)
1.551 Downloading nvidia-cufft-cu12 (184.2MiB)
1.551 Downloading nvidia-cusparse-cu12 (274.9MiB)
1.551 Downloading torch (858.1MiB)
55.75   × Failed to download `nvidia-cublas-cu12==12.8.4.1`
55.75   ├─▶ Failed to extract archive:
55.75   │   nvidia_cublas_cu12-12.8.4.1-py3-none-manylinux_2_27_x86_64.whl
55.75   ├─▶ I/O operation failed during extraction
55.75   ╰─▶ failed to write to file
55.75       `/root/.cache/uv/.tmpNJ0F9J/nvidia/cublas/lib/libcublasLt.so.12`: No
55.75       space left on device (os error 28)
55.75   help: `nvidia-cublas-cu12` (v12.8.4.1) was included because `nexira-copilot`
55.75         (v0.1.0) depends on `sentence-transformers` (v5.2.0) which depends on
55.75         `torch` (v2.9.1) which depends on `nvidia-cublas-cu12`
------
Dockerfile:25
--------------------
  24 |     # Install Python dependencies
  25 | >>> RUN --mount=type=cache,target=/root/.cache/uv \
  26 | >>>     uv sync --frozen --no-dev
  27 |     
--------------------
ERROR: failed to build: failed to solve: process "/bin/sh -c uv sync --frozen --no-dev" did not complete successfully: exit code: 1
tridungduong16@instance-20260210-022358:~/GBNX-Gold-Trader/backend$ 


# Backend

# Real-time websocket data
- websocket data

# Pydantic Agent
- chat

# News API
- get data from search service
- run via LLM 