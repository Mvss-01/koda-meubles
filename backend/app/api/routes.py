from fastapi import APIRouter, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from langchain_core.messages import HumanMessage
import json
import asyncio
import uuid

from app.agent.graph import graph
from app.api.tool_state import pending_popups

router = APIRouter()


class ChatRequest(BaseModel):
    message: str
    thread_id: str | None = None
    user_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    thread_id: str


class PopupResponseRequest(BaseModel):
    thread_id: str
    result: str


def extract_reply(result: dict) -> str:
    messages = result.get("messages", [])
    if not messages:
        return "I'm sorry, I wasn't able to generate a response."
    last = messages[-1]
    content = last.content if hasattr(last, "content") else str(last)
    if not content or not content.strip():
        return "I'm sorry, I wasn't able to generate a response."
    return content.strip()


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id, "user_id": request.user_id}}
    state = {
        "messages": [HumanMessage(content=request.message)],
        "question": request.message,
    }
    try:
        result = await asyncio.to_thread(graph.invoke, state, config=config)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    return ChatResponse(reply=extract_reply(result), thread_id=thread_id)


@router.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    thread_id = request.thread_id or str(uuid.uuid4())
    config = {"configurable": {"thread_id": thread_id, "user_id": request.user_id}}
    state = {
        "messages": [HumanMessage(content=request.message)],
        "question": request.message,
    }

    async def event_generator():
        try:
            async for mode, event in graph.astream(state, config=config, stream_mode=["updates", "debug"]):
                if mode == "debug":
                    if event.get("type") == "task":
                        node_name = event.get("payload", {}).get("name")
                        if node_name:
                            payload = {
                                "type": "node_start",
                                "node": node_name,
                                "thread_id": thread_id,
                            }
                            yield f"data: {json.dumps(payload)}\n\n"
                elif mode == "updates":
                    for node_name, node_output in event.items():
                        if isinstance(node_output, dict):
                            messages = node_output.get("messages", [])
                        else:
                            messages = []
                        if messages:
                            last = messages[-1]
                            content = last.content if hasattr(last, "content") else str(last)
                            if content and content.strip():
                                payload = {
                                    "type": "message",
                                    "node": node_name,
                                    "content": content.strip(),
                                    "thread_id": thread_id,
                                }
                                yield f"data: {json.dumps(payload)}\n\n"
            yield f"data: {json.dumps({'done': True, 'thread_id': thread_id})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'error': str(e)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")


@router.get("/health")
async def health():
    return {"status": "ok"}


@router.get("/chat/popup")
async def check_popup(thread_id: str):
    if thread_id in pending_popups:
        return {"has_popup": True, "type": pending_popups[thread_id].get("type")}
    return {"has_popup": False}


@router.post("/chat/popup_respond")
async def respond_popup(request: PopupResponseRequest):
    thread_id = request.thread_id
    if thread_id in pending_popups:
        pending_popups[thread_id]["result"] = request.result
        pending_popups[thread_id]["event"].set()
        return {"status": "success"}
    return {"status": "not_found"}
