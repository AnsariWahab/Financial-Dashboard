# RAG & AI Assistant — Code Explained
### `backend/rag_system.py` + `backend/ai_chat.py`

---

## What Problem Does RAG Solve?

The AI assistant needs to answer questions about OMOTEC's financial data. The naive approach would be to dump all database rows into every prompt — but that would:
- Cost a lot (large prompts = expensive API calls)
- Be slow (more tokens = slower response)
- Often exceed the model's context window limit

**RAG's solution:** Only send the parts of your data that are relevant to the specific question being asked.

```
Without RAG:  question + ALL 10,000 rows → LLM → answer
With RAG:     question → search → top 5 relevant summaries + question → LLM → answer
```

---

## The Three Phases of RAG

### Phase 1: INDEXING (runs once at startup)

**File:** `rag_system.py → index_omotec_financials()`

Converts raw financial data into searchable vector embeddings stored in ChromaDB.

**What gets indexed (chunk types):**

| Chunk Type | Example ID | What it contains |
|------------|-----------|-----------------|
| `overall_summary` | `overall_summary` | All years, all segments combined |
| `year_summary` | `year_FY25-26` | Full P&L for one financial year — Revenue, GP, EBITDA, PAT, students, schools |
| `segment_summary` | `segment_centre` | All-years totals for one segment |
| `year_segment_summary` | `year_FY25-26_segment_centre` | One year × one segment |
| `monthly_summary` | `monthly_FY25-26_April` | One month in one year |
| `operational_metrics` | `operational_metrics` | Total students and schools |

**Why year-level chunks matter:**
The original code only had monthly chunks. When asked *"What is the total revenue of FY25-26?"*, it would retrieve 3 random monthly chunks and try to add them up — getting a partial answer. Now there is a pre-computed annual chunk that already has the full year total, so the AI answers correctly in one shot.

**What a chunk looks like (text stored in ChromaDB):**
```
Annual Financial Performance for FY25-26:
Total Revenue: ₹1,234.56 Lakhs
Total Direct Expense: ₹567.89 Lakhs
Gross Profit: ₹666.67 Lakhs (54.0% margin)
Indirect Expense: ₹123.45 Lakhs
EBITDA: ₹543.22 Lakhs (44.0% margin)
...
PAT (Net Profit): ₹412.10 Lakhs (33.4% margin)
Students Impacted: 4,521
Schools Partnered: 87
```

**What is an embedding vector?**
The embedding model reads the chunk text and outputs a list of ~384 numbers. This list represents the *meaning* of the text in mathematical space. Chunks with similar meaning end up with similar vectors:

```
"What is our profit?"     → [0.23, -0.41, 0.88, ...]  ← close in space
"How much did we earn?"   → [0.25, -0.39, 0.91, ...]  ← similar meaning
"What is the weather?"    → [-0.71, 0.33, -0.12, ...] ← far away
```

**Embedding backend (set in `.env`):**
```
EMBEDDING_BACKEND=onnx                  # default — ~50MB, no PyTorch
EMBEDDING_BACKEND=sentence_transformers # ~500MB, pulls in PyTorch
```

ChromaDB's built-in ONNX model (`all-MiniLM-L6-v2`) is used by default. It produces the same quality embeddings for short financial text without requiring PyTorch.

---

### Phase 2: RETRIEVAL (runs on every user question)

**File:** `rag_system.py → retrieve(query, n_results=5)`

1. User asks: *"How is the School segment performing in FY25-26?"*
2. The same embedding model converts the question to a vector
3. ChromaDB computes cosine similarity between the question vector and all stored chunk vectors
4. Returns the top 5 closest matches

```python
results = self.collection.query(
    query_texts=[query],       # the user's question
    n_results=5                # how many chunks to return
)
```

The result includes:
- `documents` — the raw text of each matching chunk
- `metadatas` — type, year, segment tags
- `distances` — how far each chunk is (converted to `relevance_score = 1 - distance`)

**Why semantic search beats keyword search:**
A keyword search for *"FY25_26 income"* would miss a chunk that says *"Annual Revenue for FY25-26"* because the words don't match. Semantic search finds it because the meaning is the same.

---

### Phase 3: GENERATION (the LLM call)

**File:** `ai_chat.py → chat()`

1. Retrieved chunks are formatted into a context block by `generate_context()`
2. A prompt is assembled:

```
SYSTEM:
You are a financial analyst for OMOTEC Educational Services.
Use ONLY the data provided below to answer questions.
Be specific with numbers. Express amounts in Lakhs.

RELEVANT FINANCIAL DATA:
[Document 1] (Relevance: 94.2%)
Annual Financial Performance for FY25-26:
Total Revenue: ₹1,234.56 Lakhs
...

USER:
How is the School segment performing in FY25-26?
```

3. This is sent to the Groq API:
```python
self.client.chat.completions.create(
    model="llama-3.3-70b-versatile",
    messages=[
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": user_message}
    ]
)
```

4. The response is returned to the frontend along with metadata:
```json
{
  "message": "The School segment generated ₹412.3 Lakhs in revenue...",
  "rag_enabled": true,
  "documents_retrieved": 5,
  "model": "llama-3.3-70b-versatile"
}
```

---

## `rag_system.py` — Full Walkthrough

### `__init__`
```python
self.client = chromadb.PersistentClient(path="./chroma_db")
```
Creates or opens the ChromaDB database on disk at `backend/chroma_db/`. Persistent means data survives server restarts — no re-indexing needed unless you change the data.

```python
self.collection = self.client.get_collection("omotec_financials", ...)
# OR if not found:
self.collection = self.client.create_collection("omotec_financials", ...)
```
A ChromaDB **collection** is like a table — a named container for vectors. One collection holds all OMOTEC financial chunks.

### `build_embedding_function()`
Returns the embedding model based on `EMBEDDING_BACKEND` env var. Called once in `__init__` and used for both indexing and querying (must be the same model both ways — otherwise the vector spaces don't match).

### `index_omotec_financials(force_reindex=False)`
```python
if self.collection.count() > 0 and not force_reindex:
    print(f"📚 RAG already indexed with {self.collection.count()} documents")
    return
```
Skips re-indexing if the collection already has data. Call with `force_reindex=True` (via `POST /api/reindex`) after adding new data to MySQL.

The indexing loop:
1. Calls `get_financials()` to load all data from MySQL
2. For each chunk type, builds a human-readable text string
3. Appends to `documents[]`, `metadatas[]`, `ids[]`
4. Calls `self.collection.add(documents, metadatas, ids)` to store everything

### `retrieve(query, n_results=5)`
```python
n_results=min(n_results, count)
```
Important guard — ChromaDB throws an error if you request more results than exist in the collection. This clamps `n_results` to the actual count.

### `generate_context(retrieved_docs)`
Formats the retrieved chunks into a readable block for the LLM. Each document is labeled with its relevance score so the model knows which information is most trustworthy.

---

## `ai_chat.py` — Full Walkthrough

### `__init__`
```python
self.client = Groq(api_key=self.api_key)
```
Initializes the Groq client. Groq provides fast inference for open-source LLMs (LLaMA). It's compatible with the OpenAI SDK format.

**Why Groq instead of OpenAI?**
- Free tier is generous
- LLaMA 3.3 70B is excellent at structured data analysis
- Much faster inference than OpenAI for the same model size

### `build_system_prompt(context)`
Builds the system prompt that tells the LLM:
- Its role (OMOTEC financial analyst)
- What data it has access to (the RAG context)
- How to format answers (use Lakhs, be specific)
- What not to do (don't make up numbers not in the data)

The quality of this prompt directly determines answer quality. Key rules embedded:
- "Use ONLY the data provided" → prevents hallucination
- "Be specific with numbers" → prevents vague answers
- "If the data doesn't contain the answer, say so" → prevents making things up

### `chat(message, filters=None)`
The main function called by `app.py`:

```python
def chat(self, message: str, filters=None) -> dict:
    # Step 1: Retrieve relevant chunks
    retrieved_docs = self.rag.retrieve(message, n_results=5)

    # Step 2: Build context from chunks
    context = self.rag.generate_context(retrieved_docs)

    # Step 3: Build system prompt with context
    system_prompt = self.build_system_prompt(context)

    # Step 4: Call Groq API
    response = self.client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message}
        ]
    )

    # Step 5: Return answer + metadata
    return {
        "message": response.choices[0].message.content,
        "rag_enabled": True,
        "documents_retrieved": len(retrieved_docs),
        "model": "llama-3.3-70b-versatile"
    }
```

### Global Singleton
```python
ai_chat = FinancialAIChat()
```
Created once when `app.py` imports `ai_chat`. The Groq client and RAG system are initialized once and reused across all requests — avoids reconnection overhead on every chat message.

---

## ChromaDB Key Concepts

| Term | Meaning |
|------|---------|
| **Collection** | A named group of vectors (like a DB table). Here: `omotec_financials` |
| **Document** | The raw text chunk stored alongside its vector |
| **Embedding** | The numeric vector (~384 floats) representing a document's meaning |
| **Metadata** | Extra fields stored with each doc: `type`, `year`, `segment` |
| **Distance** | How far two vectors are. Lower = more similar |
| **Relevance score** | `1 - distance` — higher = more relevant |
| **Persistent client** | Saves to disk so data survives restarts |

---

## Telemetry Warning (not an error)

```
Failed to send telemetry event ClientStartEvent: capture() takes 1 positional argument but 3 were given
```

ChromaDB tries to send usage analytics to Posthog. There's a version mismatch in the Posthog client. It's harmless — the telemetry fails silently and everything works normally. Setting `ANONYMIZED_TELEMETRY=False` in `.env` suppresses it.

---

## When to Reindex

The RAG index does **not** auto-update when MySQL data changes. Reindex when:
- You add new financial year data
- You add new segments or branches
- You change the measures.py calculation logic

```bash
# Via API (server must be running)
curl -X POST http://localhost:8000/api/reindex

# Or delete chroma_db/ folder and restart uvicorn
```

---

## Limitations & How to Improve

| Limitation | Current | Improvement |
|-----------|---------|------------|
| Static index | Manual reindex after data changes | Auto-reindex on DB insert via trigger |
| Single collection | All users share same data | Per-user collections for multi-tenant |
| No hybrid search | Semantic only | Add BM25 keyword search, combine scores |
| Chunk granularity | Summary level | Add transaction-level chunks for precision |
| No memory | Each question is independent | Add conversation history to prompt |
