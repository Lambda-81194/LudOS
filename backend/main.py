import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel
from rag import RAGEngine

try:
    from .rag import RAGEngine
except ImportError:
    try:
        from backend.rag import RAGEngine
    except ImportError:
        from rag import RAGEngine

load_dotenv()

app = FastAPI(title="Game Recommendation RAG Service")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_api_key = os.environ.get("GROQ_API_KEY")
if not groq_api_key:
    print("WARNING: GROQ_API_KEY is missing from environment variables!")

groq_client = Groq(api_key=groq_api_key)

_rag_engine = None

def get_rag_engine():
    global _rag_engine
    if _rag_engine is None:
        print("Initializing RAGEngine on first request...")
        BASE_DIR = os.path.dirname(os.path.abspath(__file__))
        DATA_DIR = os.path.join(BASE_DIR, "data")
        _rag_engine = RAGEngine(data_dir=DATA_DIR)
    return _rag_engine

class QueryRequest(BaseModel):
    query: str

@app.get("/")
def health_check():
    return {"status": "ok", "message": "Backend server is running!"}

@app.post("/api/rag-query")
async def handle_query(request: QueryRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        engine = get_rag_engine()

        retrieved_data = engine.retrieve(request.query, top_k=3)
        context_str = (
            "\n---\n".join(retrieved_data)
            if retrieved_data
            else "No relevant data found."
        )

        system_prompt = (
            "You are an expert video game recommendation assistant. "
            "Answer the user's question accurately and helpfully based strictly on the provided game dataset below. "
            "Combine pricing, ratings, tags, and descriptions into a coherent recommendation. "
            "If the dataset doesn't contain enough info to answer, state that clearly."
        )
        user_prompt = f"Context:\n{context_str}\n\nQuestion: {request.query}"

        completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            model="llama-3.3-70b-versatile",
            temperature=0.2,
        )

        answer = completion.choices[0].message.content
        return {"answer": answer}

    except Exception as e:
        print(f"Error processing query: {e}")
        raise HTTPException(
            status_code=500, detail=f"Internal Server Error: {str(e)}"
        )