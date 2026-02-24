import json
from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from typing import Optional, List
from src.pydantic_agent.general_chat import GeneralChatAgent, GOLD_TRADER_SYSTEM_PROMPT

router = APIRouter(prefix="/agents", tags=["agents"])

# Module-level singleton — reused across requests so the agent cache is preserved
_agent: Optional[GeneralChatAgent] = None


def get_agent() -> GeneralChatAgent:
    global _agent
    if _agent is None:
        _agent = GeneralChatAgent(
            system_prompt=GOLD_TRADER_SYSTEM_PROMPT,
            model_name="qwen-max",
        )
    return _agent


class ChatRequest(BaseModel):
    question: str
    user_id: str
    thread_id: str
    s3_keys: Optional[List[str]] = None
    mcp_servers: Optional[dict] = None


class ChatResponse(BaseModel):
    answer: str
    thread_id: str


@router.post("/chat/stream")
async def stream_chat(request: ChatRequest):
    """
    Stream the agent's response as Server-Sent Events.

    Each event is a JSON object with a `content` field.
    The stream ends with `data: [DONE]`.
    """
    agent = get_agent()

    async def generate():
        try:
            async for chunk in agent.stream_question(
                question=request.question,
                user_id=request.user_id,
                thread_id=request.thread_id,
                s3_keys=request.s3_keys,
                mcp_servers=request.mcp_servers,
            ):
                yield f"data: {json.dumps({'content': chunk})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"
        finally:
            yield "data: [DONE]\n\n"

    return StreamingResponse(generate(), media_type="text/event-stream")


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    """
    Send a question and receive a complete response (non-streaming).
    """
    agent = get_agent()
    try:
        answer = await agent.get_response(
            question=request.question,
            user_id=request.user_id,
            thread_id=request.thread_id,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return ChatResponse(answer=answer, thread_id=request.thread_id)
