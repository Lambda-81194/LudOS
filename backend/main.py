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

# Groq retires/changes models over time. Override this on Render with the
# GROQ_MODEL environment variable instead of editing code.
GROQ_MODEL = os.environ.get("GROQ_MODEL", "openai/gpt-oss-120b")


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


class SurpriseRequest(BaseModel):
    exclude: list[str] = []


class SimilarRequest(BaseModel):
    game: str


SYSTEM_PROMPT = (
    "You are a friendly video game recommendation assistant. "
    "Use only games and facts present in the provided dataset. Never invent titles, tags, prices, ratings, features, or release details. "
    "For greetings or casual messages, reply warmly in one short sentence and do not force a recommendation. "
    "For recommendation requests, return exactly 1 best-match game using exactly this plain-text format:\n"
    "1. GAME TITLE — PRICE | RATING\n"
    "   Why: one concise sentence grounded in the dataset.\n\n"
    "Keep the entire response under 60 words. "
    "If the dataset has no strong match, say so briefly and ask one useful clarifying question."
)

SURPRISE_PROMPT = (
    "You are a fun, enthusiastic video game recommender. "
    "Write a 3-4 sentence pitch for the single game provided, using only the given title, price, rating, tags, and description. "
    "Name the game in the first sentence and mention its price and rating. Never invent details."
)

KEYWORD_PROMPT = (
    "Return 5-8 comma-separated genre or gameplay keywords for the named game. "
    "Return exactly UNKNOWN if you do not recognize the game. Do not add any other text."
)

SIMILAR_PROMPT = (
    "You recommend games similar to a player's favorite. The favorite game and candidate games are provided. "
    "Choose the best 3 from ONLY the candidate games. For each, write one sentence explaining what it shares with the favorite "
    "such as genre, tags, mood, or mechanics, and mention its price and rating. Never recommend the favorite itself. "
    "Never invent games or details not present in the candidates. If fewer than 3 candidates are a good match, say so honestly. "
    "If the favorite is not in the dataset, say that in the first sentence."
)


@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend server is running!"}


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
            model=GROQ_MODEL,
            temperature=0.2,
            max_completion_tokens=4096,
            reasoning_effort="low",
        )
        return {"answer": completion.choices[0].message.content}

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error processing query")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


@app.post("/api/surprise")
def handle_surprise(request: SurpriseRequest):
    try:
        game = get_rag_engine().random_game(exclude=request.exclude[-500:])
        if game is None:
            raise HTTPException(status_code=404, detail="No games available.")

        title, game_text = game
        completion = get_groq_client().chat.completions.create(
            messages=[
                {"role": "system", "content": SURPRISE_PROMPT},
                {
                    "role": "user",
                    "content": f"Context:\n{game_text}\n\nPitch this game to a curious player.",
                },
            ],
            model=GROQ_MODEL,
            temperature=0.8,
        )
        return {"answer": completion.choices[0].message.content, "title": title}

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error processing surprise request")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")


@app.post("/api/similar")
def handle_similar(request: SimilarRequest):
    game = request.game.strip()
    if not game:
        raise HTTPException(status_code=400, detail="Game name cannot be empty.")
    if len(game) > 200:
        raise HTTPException(status_code=400, detail="Game name cannot exceed 200 characters.")

    try:
        engine = get_rag_engine()
        match = engine.find_game(game)
        found = match is not None

        if found:
            matched_title, favorite_chunk = match
            candidates = engine.similar_games(favorite_chunk, matched_title)
            favorite_context = favorite_chunk
        else:
            keyword_completion = get_groq_client().chat.completions.create(
                messages=[
                    {"role": "system", "content": KEYWORD_PROMPT},
                    {"role": "user", "content": f"Game: {game}"},
                ],
                model=GROQ_MODEL,
                temperature=0,
            )
            keywords = (keyword_completion.choices[0].message.content or "").strip()
            if keywords.upper() == "UNKNOWN":
                return {
                    "found": False,
                    "matched_title": None,
                    "answer": "I couldn't find that game. Check the spelling or try another title.",
                }
            matched_title = None
            favorite_context = f"{game} (not in our dataset, matched by genre keywords: {keywords})"
            candidates = engine.similar_from_keywords(keywords, game)

        candidate_context = "\n---\n".join(candidates) if candidates else "No candidate games found."
        completion = get_groq_client().chat.completions.create(
            messages=[
                {"role": "system", "content": SIMILAR_PROMPT},
                {
                    "role": "user",
                    "content": (
                        f"Favorite game:\n{favorite_context}\n\n"
                        f"Candidate games:\n{candidate_context}"
                    ),
                },
            ],
            model=GROQ_MODEL,
            temperature=0.3,
        )
        return {
            "found": found,
            "matched_title": matched_title,
            "answer": completion.choices[0].message.content,
        }

    except HTTPException:
        raise
    except Exception as e:
        logging.exception("Error processing similar request")
        raise HTTPException(status_code=500, detail=f"Internal Server Error: {e}")