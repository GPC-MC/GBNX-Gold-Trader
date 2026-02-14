from fastapi import APIRouter
from src.pricings.router import router as pricing_rest_router
from src.pricings.websocket_router import router as pricing_ws_router

router = APIRouter()

router.include_router(pricing_rest_router)
router.include_router(pricing_ws_router)
