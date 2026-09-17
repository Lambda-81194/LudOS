import os
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from groq import Groq
from pydantic import BaseModel

# Safe fallback imports for Pylance / Uvicorn execution
try:
    from rag import RAGEngine
except ImportError:
    try:
        from backend.rag import RAGEngine
    except ImportError:
        from .rag import RAGEngine

# Load environment variables
load_dotenv()

app = FastAPI(title="Game Recommendation RAG Service")

# Enable CORS for React frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq client
groq_api_key = os.environ.get("GROQ_API_KEY")
if not groq_api_key:
    print("WARNING: GROQ_API_KEY is missing from environment variables!")

groq_client = Groq(api_key=groq_api_key)

# Initialize RAG Engine relative to this file's location
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, "data")
rag_engine = RAGEngine(data_dir=DATA_DIR)


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
        # 1. Retrieve top matching game contexts (merged CSV + JSON data)
        retrieved_data = rag_engine.retrieve(request.query, top_k=3)
        context_str = (
            "\n---\n".join(retrieved_data)
            if retrieved_data
            else "No relevant data found."
        )

        # 2. Build system and user prompts
        system_prompt = (
            "You are an expert video game recommendation assistant. "
            "Answer the user's question accurately and helpfully based strictly on the provided game dataset below. "
            "Combine pricing, ratings, tags, and descriptions into a coherent recommendation. "
            "If the dataset doesn't contain enough info to answer, state that clearly."
        )
        user_prompt = f"Context:\n{context_str}\n\nQuestion: {request.query}"

        # 3. Request completion from Groq API
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