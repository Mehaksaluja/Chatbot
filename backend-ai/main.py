import json
import uuid

from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field
from dotenv import load_dotenv

load_dotenv()

from agents.graph import graph
from agents.state import AgentState
from utils.pdf_parser import parse_pdf_bytes
from utils.vectorstore import upsert_chunks
from utils.youtube import extract_video_id, get_transcript_chunks

app = FastAPI(title="Multimodal RAG API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class VideoIngestRequest(BaseModel):
    url: str


class ChatMessage(BaseModel):
    role: str
    content: str


class QueryRequest(BaseModel):
    query: str
    source_ids: list[str]
    history: list[ChatMessage] = Field(default_factory=list)


@app.get("/health")
async def health():
    return {"status": "ok"}


@app.post("/ingest/video")
async def ingest_video(body: VideoIngestRequest):
    try:
        video_id = extract_video_id(body.url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    try:
        chunks = get_transcript_chunks(video_id)
    except ValueError as e:
        raise HTTPException(status_code=422, detail=str(e))

    source_id = f"vid_{video_id}"
    count = upsert_chunks(chunks, source_id=source_id, source_type="video")

    return {"source_id": source_id, "chunks_indexed": count}


@app.post("/ingest/pdf")
async def ingest_pdf(file: UploadFile = File(...)):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    contents = await file.read()
    chunks = parse_pdf_bytes(contents)

    source_id = f"pdf_{uuid.uuid4().hex[:12]}"
    count = upsert_chunks(chunks, source_id=source_id, source_type="pdf")

    return {"source_id": source_id, "filename": file.filename, "chunks_indexed": count}


NODE_MESSAGES = {
    "condense": "Understanding your question...",
    "route": "Routing your query to the right sources...",
    "retrieve": "Retrieving relevant context...",
    "grade": "Grading context quality...",
    "synthesize": "Generating your answer...",
}


def _citations_from_context(context: list[dict]) -> list[dict]:
    citations = []
    seen = set()
    for chunk in context:
        if chunk.get("source_type") == "video":
            ref = str(chunk.get("timestamp", "?"))
            key = ("video", ref)
        else:
            ref = str(chunk.get("page", "?"))
            key = ("pdf", ref)
        if key in seen:
            continue
        seen.add(key)
        citations.append({
            "source_type": key[0],
            "ref": ref,
            "snippet": (chunk.get("text") or "")[:180],
        })
    return citations


@app.post("/query")
async def query(body: QueryRequest):
    if not body.source_ids:
        raise HTTPException(status_code=400, detail="Provide at least one source_id.")

    initial_state: AgentState = {
        "user_query": body.query,
        "chat_history": [m.model_dump() for m in body.history],
        "active_sources": body.source_ids,
        "retrieved_context": [],
        "rewrite_count": 0,
        "final_answer": None,
    }

    async def event_stream():
        def sse(payload: dict) -> str:
            return f"data: {json.dumps(payload)}\n\n"

        final_answer = None
        streamed_tokens = False
        try:
            async for mode, chunk in graph.astream(initial_state, stream_mode=["updates", "messages"]):
                if mode == "updates":
                    node_name = next(iter(chunk))
                    message = NODE_MESSAGES.get(node_name, node_name)
                    yield sse({"type": "status", "node": node_name, "message": message})

                    node_state = chunk.get(node_name) or {}
                    # Once grading finishes, the retrieved context is final — surface citations.
                    if node_name == "grade" and node_state.get("retrieved_context"):
                        yield sse({
                            "type": "citations",
                            "citations": _citations_from_context(node_state["retrieved_context"]),
                        })
                    if node_state.get("final_answer"):
                        final_answer = node_state["final_answer"]

                elif mode == "messages":
                    msg, metadata = chunk
                    # Only stream tokens from the answer-writing node, not router/grader calls.
                    if metadata.get("langgraph_node") == "synthesize" and msg.content:
                        streamed_tokens = True
                        yield sse({"type": "token", "content": msg.content})

            # Fallback for environments where token streaming isn't captured.
            if final_answer and not streamed_tokens:
                yield sse({"type": "answer", "content": final_answer})
        except Exception as e:
            yield sse({"type": "error", "message": str(e)})

        yield sse({"type": "done"})

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
