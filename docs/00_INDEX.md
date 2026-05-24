# Financial Dashboard — Code Documentation

This folder explains every file in the project. Split into 4 focused docs:

| File | Covers |
|------|--------|
| `01_BACKEND.md` | All Python files — how the server, database, and calculations work |
| `02_RAG_AND_AI.md` | How the AI assistant works — RAG pipeline, ChromaDB, Groq |
| `03_FRONTEND.md` | All React/TypeScript files — components, API service, routing |
| `04_CONFIG_AND_INFRA.md` | Config files, environment variables, caching, project structure |

---

## Quick Architecture Map

```
Browser (React)
    │
    │  HTTP (localhost:5173)
    ▼
Vite Dev Server
    │
    │  fetch() calls
    ▼
FastAPI Backend (localhost:8000)
    │
    ├── database.py ──────────► MySQL (dashboard)
    │       │
    │       └── returns DataFrame
    │
    ├── measures.py ◄──────── DataFrame from database.py
    │       │
    │       └── calculates Revenue, PAT, EBITDA etc.
    │
    ├── rag_system.py ────────► ChromaDB (./chroma_db/)
    │       │                   (local vector database)
    │       └── semantic search over financial summaries
    │
    └── ai_chat.py ───────────► Groq API (LLaMA 3.3 70B)
            │
            └── retrieves RAG context + calls LLM
```

## Data Flow on Page Load

```
1. React component mounts
2. useEffect() triggers fetchData()
3. Promise.all() fires 4 API calls in parallel:
   - GET /api/pnl-measures
   - GET /api/segment-data
   - GET /api/monthly-trend
   - GET /api/impact-metrics
4. FastAPI checks in-memory cache (5-min TTL)
   - Cache HIT  → returns instantly
   - Cache MISS → queries MySQL → runs measures.py → caches → returns
5. React sets state → component re-renders with data
```

## Data Flow for AI Chat

```
1. User types question in AIChat.tsx
2. POST /api/ai/chat { message: "..." }
3. ai_chat.py calls rag.retrieve(question, n=5)
4. rag_system.py embeds question → searches ChromaDB
5. Returns top 5 relevant financial summary chunks
6. ai_chat.py builds prompt: system + retrieved chunks + question
7. Groq API (LLaMA 3.3 70B) generates answer
8. Response shown in chat UI
```
