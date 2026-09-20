# LudOS Game AI

LudOS is a game recommendation assistant with a React frontend and a FastAPI backend. It uses a TF-IDF retrieval index over the local game dataset and Groq to turn retrieved game data into conversational recommendations.

## Features

- Natural-language game recommendations
- Surprise Me mode with random, well-rated game selection
- Similar-game search with tolerant title matching and typo handling
- Price, review, title, tag, and description data from the game dataset
- Light and dark themes
- Structured recommendation formatting in the chat interface

## Project Structure

```text
backend/
  main.py                 FastAPI application and API routes
  rag.py                  Dataset loading, TF-IDF retrieval, and game matching
  requirements.txt        Python dependencies
  data/
    games.csv             Core game data
    games_metadata.json   Game descriptions and tags
    chunks.json           Cached text chunks used by the RAG engine

frontend/
  src/
    pages/ChatPage.tsx    Main chat workflow
    components/           Chat UI and quick-mode components
    services/aiService.js Frontend API calls
```

## Requirements

- Python 3.10 or newer
- Node.js 18 or newer
- npm
- A Groq API key

## Configuration

Create `backend/.env`:

```env
GROQ_API_KEY=your_groq_api_key
```

Optional settings:

```env
GROQ_MODEL=openai/gpt-oss-120b
ALLOWED_ORIGINS=http://localhost:5173
```

The frontend reads the backend URL from `VITE_BACKEND_URL`. Without it, development defaults to:

```text
http://127.0.0.1:8000
```

For a deployed frontend, set `VITE_BACKEND_URL` to the deployed backend URL before building.

## Run Locally

Open two terminals from the project root.

### Backend

```bash
python -m venv .venv
```

Windows PowerShell:

```powershell
.venv\Scripts\Activate.ps1
```

macOS/Linux:

```bash
source .venv/bin/activate
```

Install dependencies and start FastAPI:

```bash
pip install -r backend/requirements.txt
uvicorn backend.main:app --reload --host 127.0.0.1 --port 8000
```

The backend will be available at `http://127.0.0.1:8000`.

### Frontend

In a second terminal:

```bash
cd frontend
npm install
npm run dev
```

Open the URL printed by Vite, normally `http://localhost:5173`.

## Production Build

```bash
cd frontend
npm run build
```

The build runs TypeScript checking and creates the Vite production output in `frontend/dist`.

## API Endpoints

### Health check

```bash
curl http://127.0.0.1:8000/
```

### Normal recommendation chat

```bash
curl -X POST http://127.0.0.1:8000/api/rag-query \
  -H "Content-Type: application/json" \
  -d "{\"query\":\"I want a relaxing farming game\"}"
```

### Surprise Me

```bash
curl -X POST http://127.0.0.1:8000/api/surprise \
  -H "Content-Type: application/json" \
  -d "{\"exclude\":[]}"
```

The response contains an AI pitch and the selected game's title:

```json
{
  "answer": "...",
  "title": "..."
}
```

### Similar games

```bash
curl -X POST http://127.0.0.1:8000/api/similar \
  -H "Content-Type: application/json" \
  -d "{\"game\":\"Stardew Valley\"}"
```

The endpoint supports exact titles, case differences, titles inside sentences, and small spelling mistakes. It returns whether the title was found in the local dataset and the matched title when available.

## Data and RAG Behavior

The RAG engine combines:

- `games.csv` for core fields such as title, price, rating, review percentage, and platform information
- `games_metadata.json` for descriptions and tags when available
- `chunks.json` as the cached combined text representation

The backend automatically rebuilds chunks when the source files are newer than `chunks.json`. Normal chat and similar-game search build the TF-IDF index on demand. Surprise Me loads the chunks and selects a game randomly without building the TF-IDF index.

## Deployment Notes

The backend can be deployed as a FastAPI service, including on Render's free tier. Configure these environment variables in the deployment service:

```env
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
ALLOWED_ORIGINS=https://your-frontend-domain.example
```

Set the frontend's `VITE_BACKEND_URL` to the public backend URL before running the frontend production build.

## Troubleshooting

### The browser reports a CORS or network error

Make sure the backend is running and that the frontend is calling the correct URL. Test the backend directly:

```bash
curl http://127.0.0.1:8000/
```

If the frontend is deployed, set `VITE_BACKEND_URL` to the deployed backend URL and rebuild the frontend.

### Recommendations are missing tags or descriptions

Check that `backend/data/games_metadata.json` contains the relevant records. The RAG engine can still use CSV data when metadata is missing, but the recommendation will have less context.

### The backend reports a missing Groq key

Add `GROQ_API_KEY` to `backend/.env` locally or to the deployment service's environment variables. Never commit the key to the repository.
