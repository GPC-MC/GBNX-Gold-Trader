from fastapi import APIRouter, HTTPException, Query, Request, Response

router = APIRouter(prefix="/webhook/facebook", tags=["facebook-webhook"])

VERIFY_TOKEN = "12345"


@router.get("")
async def verify_facebook_webhook(
    hub_mode: str = Query(default="", alias="hub.mode"),
    hub_challenge: str = Query(default="", alias="hub.challenge"),
    hub_verify_token: str = Query(default="", alias="hub.verify_token"),
) -> Response:
    if hub_mode != "subscribe":
        raise HTTPException(status_code=400, detail="Invalid hub.mode")
    if hub_verify_token != VERIFY_TOKEN:
        raise HTTPException(status_code=403, detail="Invalid verify token")
    return Response(content=hub_challenge, media_type="text/plain")


@router.post("")
async def receive_facebook_webhook(request: Request) -> dict[str, bool]:
    # Keep endpoint lightweight: acknowledge webhook immediately.
    await request.body()
    return {"ok": True}
