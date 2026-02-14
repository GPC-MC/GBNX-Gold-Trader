# GPU Dependencies Removal Summary

## Changes Made

### 1. Updated `pyproject.toml`
- Added explicit `torch>=2.0.0` dependency
- Configured uv to use PyTorch CPU-only index
- Added custom index configuration for CPU-only packages

### 2. Regenerated `uv.lock`
- Removed old lock file
- Generated new lock file with CPU-only PyTorch
- **Verified: NO nvidia/cuda packages in dependencies**

## Verification

All torch packages now use CPU-only versions:
```
torch version 2.10.0+cpu from https://download.pytorch.org/whl/cpu
```

No GPU packages found:
- ❌ nvidia-cublas-cu12 (REMOVED)
- ❌ nvidia-cudnn-cu12 (REMOVED)
- ❌ nvidia-cufft-cu12 (REMOVED)
- ❌ nvidia-cusolver-cu12 (REMOVED)
- ❌ nvidia-cusparse-cu12 (REMOVED)
- ❌ nvidia-cusparselt-cu12 (REMOVED)
- ❌ nvidia-nccl-cu12 (REMOVED)

## Benefits

1. **Reduced download size**: ~2GB → ~200MB
2. **Faster builds**: No large NVIDIA packages to download
3. **Less disk space**: Docker builds require significantly less space
4. **CPU-only deployment**: Suitable for servers without GPU

## Next Steps

1. Run cleanup on server:
   ```bash
   ./cleanup_server.sh
   ```

2. Deploy with new dependencies:
   ```bash
   git add pyproject.toml uv.lock
   git commit -m "Remove GPU dependencies, use CPU-only PyTorch"
   git push
   ./deploy.sh
   ```

## Notes

- CPU-only PyTorch is sufficient for inference with sentence-transformers
- If GPU support is needed in the future, remove the CPU-only index configuration
- The application will run on CPU without any code changes
