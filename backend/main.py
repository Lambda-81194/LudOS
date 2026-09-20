import logging
import os

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

# Works whether you run `uvicorn main:app` (from backend/)
# or `uvicorn backend.main:app` (from the project root).
try:
    from .rag import RAGEngine
except ImportError:
    try:
        from backend.rag import RAGEngine
    except ImportError:
        from rag import RAGEngine

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
load_dotenv(os.path.join(BASE_DIR, ".env"))

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Game Recommendation RAG Service")

# Set ALLOWED_ORIGINS="http://localhost:5173,https://your-site.com" in .env
# to lock this down. "*" is fine for development.
allowed_origins = [
    o.strip() for o in os.environ.get("ALLOWED_ORIGINS", "*").split(",") if o.strip()
]
app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=False,  # "*" + credentials is rejected by browsers
    allow_methods=["*"],
    allow_headers=["*"],
)

if not os.environ.get("GROQ_API_KEY"):
    print("WARNING: GROQ_API_KEY is missing from environment variables!")

_groq_client = None
_rag_engine = None


def get_groq_client():
    # Groq(api_key=None) raises at import time, which crashes the whole server
    # before it can even answer the health check. Create it lazily instead.
    global _groq_client
    if _groq_client is None:
        key = os.environ.get("GROQ_API_KEY")
        if not key:
            raise HTTPException(
                status_code=500, detail="GROQ_API_KEY is not configured on the server."
            )
        _groq_client = Groq(api_key=key)
    return _groq_client


def get_rag_engine():
    global _rag_engine
    if _rag_engine is None:
        print("Initializing RAGEngine on first request...")
        _rag_engine = RAGEngine(data_dir=os.path.join(BASE_DIR, "data"))
    return _rag_engine


class QueryRequest(BaseModel):
    query: str


SYSTEM_PROMPT = (
    "You are an expert video game recommendation assistant. "
    "Answer the user's question accurately and helpfully based strictly on the provided game dataset below. "
    "Combine pricing, ratings, tags, and descriptions into a coherent recommendation. "
    "If the dataset doesn't contain enough info to answer, state that clearly."
)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend server is running!"}


# Plain `def` (not `async def`): retrieval and the Groq call are blocking, and
# FastAPI runs sync endpoints in a threadpool so they don't freeze the server.
@app.post("/api/rag-query")
def handle_query(request: QueryRequest):
    query = request.query.strip()
    if not query:
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        engine = get_rag_engine()
        retrieved = engine.retrieve(query, top_k=3)
        context_str = (
            "\n---\n".join(retrieved) if retrieved else "No relevant data found."
        )

        completion = get_groq_client().chat.completions.create(
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": f"Context:\n{context_str}\n\nQuestion: {query}"},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )
        return {"answer": completion.choices[0].message.content}

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error processing query")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")