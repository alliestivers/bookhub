from fastapi import APIRouter, Request, HTTPException, Header
import hmac
import hashlib
import os

router = APIRouter()

@router.post("/webhook/n8n")
async def n8n_webhook(
    request: Request,
    x_webhook_secret: str = Header(default=None)
):
    secret = os.getenv("N8N_WEBHOOK_SECRET")
    if secret and x_webhook_secret != secret:
        raise HTTPException(status_code=401, detail="Invalid webhook secret")

    body = await request.json()

    return {
        "status": "received",
        "manuscript_id": body.get("manuscript_id"),
        "message": "Processing started"
    }
