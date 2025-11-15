from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import Any, Dict
import asyncio

import backend  # backend.py


app = FastAPI()


class VideoClipPayload(BaseModel):
    video_base64: str
    model_kwargs: Dict[str, Any]
    openrouter_api_key: str
    metadata: Dict[str, Any]


class NotesPayload(BaseModel):
    query: str
    model_kwargs: Dict[str, Any]
    openrouter_api_key: str


@app.post("/upload_video_clip")
async def upload_video_clip(payload: VideoClipPayload):
    print(str(payload)[:100])
    try:
        result = await asyncio.to_thread(
            backend.handle_incoming_clips,
            payload.video_base64,
            payload.model_kwargs,
            payload.openrouter_api_key,
            payload.metadata,
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"result": result}


@app.post("/generate_notes")
async def generate_notes_endpoint(payload: NotesPayload):
    """
    Accepts a query + model kwargs + OpenRouter API key,
    calls backend.generate_notes (via a thread), and returns the notes.
    """
    print(str(payload)[:100])
    try:
        # Either call the async wrapper:
        # result = await backend.async_generate_notes(
        #     payload.query, payload.model_kwargs, payload.openrouter_api_key
        # )

        # Or call the sync function in a worker thread:
        result = await asyncio.to_thread(
            backend.generate_notes,
            payload.query,
            payload.model_kwargs,
            payload.openrouter_api_key,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

    return {"result": result}
