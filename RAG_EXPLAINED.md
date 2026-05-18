# Understanding RAG in This Project
### Retrieval-Augmented Generation — A Complete Learning Guide

---

## What is RAG?

RAG stands for **Retrieval-Augmented Generation**. It solves a core problem with LLMs (Large Language Models like GPT or Groq/LLaMA):

> LLMs are trained on general internet data. They know nothing about *your* company's private financial data.

The naive fix is to paste all your data into every prompt — but that's expensive (large context = expensive API calls) and slow.

RAG's answer: **only send the parts of your data that are relevant to the specific question being asked.**

```
Without RAG:  User question + ALL 10,000 rows of data → LLM → Answer
With RAG:     User question → Search → Top 3 relevant chunks + question → LLM → Answer
```

---

## The Three Phases of RAG

### Phase 1: INDEXING (happens once at startup)

This converts your raw data into a form that can be searched by *meaning*, not just keywords.

**What happens in `rag_system.py → index_omotec_financials()`:**

1. Fetch all financial data from MySQL via `get_financials()`
2. Create **text chunks** — human-readable summaries like:
   ```
   "CENTRE Segment Financial Performance:
    Revenue: ₹45.20 Lakhs
    EBITDA: ₹12.30 Lakhs (27.2% margin)
    ..."
   ```
3. Pass each chunk through an **embedding model** (sentence-transformers or ONNX)
4. The embedding model converts text → a list of ~384 numbers (a "vector")
5. Store the vectors + original text in **ChromaDB** (a vector database on your disk)

**What is an embedding vector?**
Think of it as coordinates in 384-dimensional space. Sentences with similar *meaning* end up close together in this space — even if they use different words.

```
"What is our profit?" → [0.23, -0.41, 0.88, ...]   ← very close in space ↓
"How much did we earn?" → [0.25, -0.39, 0.91, ...]  ← similar meaning = similar vector
"What is the weather?" → [-0.71, 0.33, -0.12, ...]  ← far away = different meaning
```

---

### Phase 2: RETRIEVAL (happens on every user question)

**What happens in `rag_system.py → retrieve()`:**

1. User types: *"How is the School segment performing?"*
2. The same embedding model converts this question to a vector
3. ChromaDB compares this vector to all stored vectors using **cosine similarity**
4. Returns the top 3 closest matches (most semantically relevant chunks)

This is why RAG works even when users ask the same thing in different words — the *meaning* is matched, not the exact keywords.

---

### Phase 3: GENERATION (the LLM step)

**What happens in `ai_chat.py → chat()`:**

1. The retrieved chunks are formatted into a context block
2. A carefully designed prompt is built:
   ```
   System: "You are a financial analyst for OMOTEC.
            Here is the relevant data: [retrieved chunks]
            Answer based only on this data."
   
   User: "How is the School segment performing?"
   ```
3. This is sent to **Groq API** (LLaMA 3.1 70B model)
4. The LLM generates a natural language answer grounded in your actual numbers

---

## Where Each File Fits

| File | Role in RAG |
|------|-------------|
| `rag_system.py` | Core RAG engine — indexing, retrieval, context building |
| `ai_chat.py` | Orchestrates the full pipeline: retrieve → build prompt → call Groq |
| `app.py` | FastAPI endpoint `/api/chat` that calls `ai_chat.py` |
| `database.py` | Fetches data from MySQL to feed into the indexer |
| `measures.py` | Calculates financial metrics (Revenue, PAT, EBITDA etc.) from raw rows |
| `chroma_db/` | Where ChromaDB stores vectors on disk (auto-created, gitignored) |
| `src/services/aiAgent.ts` | Frontend fallback — rule-based agent using mock data (not real RAG) |
| `src/services/api.ts` | Frontend API calls to the Python backend |
| `src/components/AIChat.tsx` | Chat UI component |

---

## The Flow — Step by Step

```
User types question in React UI (AIChat.tsx)
        ↓
api.ts sends POST /api/chat to FastAPI backend
        ↓
app.py receives request → calls ai_chat.chat()
        ↓
ai_chat.py → calls rag.retrieve(user_question)
        ↓
rag_system.py → embeds question → queries ChromaDB
        ↓
ChromaDB returns top 3 relevant financial summaries
        ↓
ai_chat.py builds prompt: system_context + retrieved_docs + user_question
        ↓
Groq API (LLaMA 3.1 70B) generates answer
        ↓
Response sent back to React UI with:
  - message: the answer
  - rag_enabled: true
  - documents_retrieved: 3
  - relevance_scores: [0.87, 0.72, 0.61]
```

---

## What Types of Chunks Are Indexed

The indexer creates 4 types of documents:

**1. Overall Summary** (`overall_summary`)
A single chunk with company-wide totals: Revenue, Gross Profit, EBITDA, PAT.

**2. Segment Summaries** (`segment_Centre`, `segment_School`, `segment_Research`)
One chunk per segment with that segment's financial metrics.

**3. Monthly Summaries** (`monthly_FY24-25_April`, etc.)
One chunk per month×year combination.

**4. Operational Metrics** (`operational_metrics`)
Students impacted, schools partnered.

When a user asks *"How was April?"*, only the April chunk + maybe the overall summary get retrieved — not all months.

---

## Embedding Backends Explained

This project supports two embedding backends, configurable via `.env`:

### Option A: ONNX (Default, Recommended)
```
EMBEDDING_BACKEND=onnx
```
- Uses ChromaDB's built-in `all-MiniLM-L6-v2` model in ONNX format
- **~50MB** download, no PyTorch required
- Fast on CPU
- Good quality for financial text

### Option B: sentence-transformers
```
EMBEDDING_BACKEND=sentence_transformers
```
- Downloads PyTorch + the model
- **~500–800MB** download
- Slightly better embedding quality
- Worth it only if you need fine-tuned embeddings

For most financial dashboard use cases, ONNX is indistinguishable in quality.

---

## Why RAG is Better Than Just "Prompt Stuffing"

| Approach | Context Size | API Cost | Speed | Scalability |
|----------|-------------|----------|-------|-------------|
| Send all data | 100K+ tokens | Very High | Slow | Poor |
| RAG (top 3 chunks) | ~500 tokens | Very Low | Fast | Excellent |

As your database grows (more years, more branches), RAG stays fast — only the ChromaDB index grows, not the prompt.

---

## Key ChromaDB Concepts

**Collection** — a named group of vectors (like a table). Here: `omotec_financials`.

**Document** — the raw text chunk stored alongside its vector.

**Embedding** — the numeric vector representation of the document.

**Metadata** — extra fields stored with each document (`type`, `segment`, `month`) — useful for filtering.

**Distance** — how far two vectors are. ChromaDB returns `distances`; the code converts to `relevance_score = 1 - distance` so higher = more relevant.

---

## Limitations of the Current Implementation

1. **Static index** — if you add new data to MySQL, the RAG index is not automatically updated. Call `rag.reindex_if_needed()` or restart the server.

2. **Chunk granularity** — currently indexed at summary level (segment totals, monthly totals). Individual transaction-level indexing would give more precise answers to specific queries.

3. **No hybrid search** — only semantic search. Adding keyword (BM25) search and combining scores would improve recall for exact number queries.

4. **Single collection** — one ChromaDB collection for all data. For multi-tenant use, you'd want per-user or per-company collections.

---

## How to Extend the RAG System

**Add new chunk types** — in `index_omotec_financials()`, add more `documents.append(...)` calls for e.g. branch-wise summaries, quarterly rollups.

**Force reindex after data updates** — call the endpoint:
```
POST /api/reindex
```
(already implemented in `app.py`)

**Switch embedding model** — change `model_name` in `build_embedding_function()` to any HuggingFace sentence-transformer model.

**Add metadata filters** — in `retrieve()`, pass a `where` clause to filter by segment before semantic search:
```python
results = self.collection.query(
    query_texts=[query],
    n_results=3,
    where={"segment": "School"}  # Only search School segment chunks
)
```
