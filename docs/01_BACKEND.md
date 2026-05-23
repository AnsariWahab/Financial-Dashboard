# Backend Code Explained
### Python files in `backend/`

---

## File Map

```
backend/
├── app.py              ← FastAPI server, all API routes, caching
├── database.py         ← MySQL connection, data fetching
├── measures.py         ← Financial calculations (Revenue, PAT, EBITDA…)
├── ai_chat.py          ← Groq AI orchestration (see 02_RAG_AND_AI.md)
├── rag_system.py       ← ChromaDB vector search (see 02_RAG_AND_AI.md)
├── create_tables.py    ← One-time DB schema setup
├── insert_sample_data.py ← Seeds sample rows for testing
├── check_schema.py     ← Utility to inspect DB columns
└── requirements.txt    ← Python dependencies
```

---

## `database.py` — MySQL Connection & Data Fetching

### Purpose
Single source of truth for all database access. Every other file that needs data calls functions from here — nothing else touches MySQL directly.

### `DB_CONFIG`
```python
DB_CONFIG = {
    'host': os.getenv('DB_HOST', '127.0.0.1'),
    'user': os.getenv('DB_USER', 'root'),
    'password': os.getenv('DB_PASSWORD', ''),
    'database': os.getenv('DB_NAME', 'omotec_dashboard'),
    'port': int(os.getenv('DB_PORT', 3306)),
}
```
All connection settings come from `.env` via `python-dotenv`. The defaults are fallbacks if `.env` is missing. Never hardcode passwords — always use `.env`.

### `get_db_connection()`
Creates and returns a MySQL connection object. Returns `None` if connection fails (so callers can handle gracefully instead of crashing).

### `_convert_decimals(df)` — Why This Exists
MySQL `DECIMAL` columns come back as Python `decimal.Decimal` objects. These cannot do arithmetic with regular `float` values:
```python
# Without fix:
decimal.Decimal('45.20') - 10.0  → TypeError ❌

# After _convert_decimals():
45.2 - 10.0  → 35.2 ✅
```
This function loops through every column in the DataFrame. If it finds `Decimal` values, it converts that column to `float64`. Called automatically after every `get_financials()` call.

### `get_financials(source_year, month, segment, branch)`
The main data-fetching function. Builds a parameterized SQL query with optional `WHERE` clauses based on which filters are provided:
```python
# No filters → fetches everything
df = get_financials()

# With filters → adds WHERE clauses
df = get_financials(source_year='FY25-26', segment='centre')
```
Uses cursor-based fetching (not `pd.read_sql`) because `mysql-connector-python` is a DBAPI2 driver, not SQLAlchemy-compatible. Returns a pandas DataFrame.

### `get_distinct_values(column_name)`
Used to populate filter dropdowns in the frontend. Returns all unique values in a column (e.g. all unique years, months, segments).

### Why Cursor Instead of `pd.read_sql`?
`pd.read_sql` expects a SQLAlchemy engine. `mysql-connector-python` provides a raw DBAPI2 connection. Mixing them causes warnings and unreliable parameter binding. The cursor approach is correct for this driver.

---

## `measures.py` — Financial Calculations

### Purpose
All P&L (Profit & Loss) metric calculations live here. Takes a pandas DataFrame of raw transaction rows and computes aggregated financial metrics. This is the business logic layer.

### How the Data is Structured
Each row in `financials` represents one financial entry with:
- `pnl_categories` — what type of entry (e.g. `'Revenue'`, `'Direct Expense'`, `'Tax'`)
- `value` — the amount in rupees
- `segment`, `branch`, `month`, `source_year` — dimensions for filtering

### `apply_adjusted_branch_value(df)`
This is the most complex function. It handles the `'ALL'` branch problem:

Some expense rows are tagged with `branch='ALL'` meaning they apply to the whole company (shared costs). These can't just be filtered to a specific branch — they need to be proportionally allocated based on each branch's revenue share.

```
Example:
  Total 'ALL' expenses = ₹100
  Branch A revenue = ₹60, Branch B revenue = ₹40
  → Branch A gets ₹60 of the shared expense
  → Branch B gets ₹40 of the shared expense
```

This mirrors a DAX (Power BI) measure that the original dashboard used.

### `get_all_pnl_measures(df, divisor)`
The main calculation function. Takes a DataFrame and a divisor (100,000 for Lakhs, 10,000,000 for Crores).

Calculates the full P&L waterfall:
```
Revenue
- Direct Expense
= Gross Profit          (+ Gross Profit %)
- Indirect Expense
= EBITDA                (+ EBITDA %)
- Depreciation
= EBIT
- Interest
= PBT
- Tax
= PAT                   (+ PAT %)
```

Each line filters `df` for rows where `pnl_categories == 'Revenue'` (or whatever category), sums the `value` column, and divides by the divisor.

```python
# Example internals:
revenue = df[df['pnl_categories'] == 'Revenue']['value'].sum() / divisor
direct_expense = df[df['pnl_categories'] == 'Direct Expense']['value'].sum() / divisor
gross_profit = revenue - direct_expense
```

### `get_unique_students(df, segment=None)`
Counts distinct `Student_name` values. Excludes the school segment by default (used on the Overview page which shows Centre + Research students only).

### `get_unique_schools(df)`
Counts distinct schools using `school_type` and `id`.

### `get_stem_labs(df)`
Counts distinct STEM lab entries.

### `get_research_count(df, category)`
Counts research entries filtered by `research_category`. Must pass a category string:
```python
get_research_count(df, "Research Paper")
get_research_count(df, "Research Competition")
```

### `build_pnl_table_data(df, years, divisor)`
Builds a comparison table with one column per financial year. Used in the Reports page to show how each P&L line changed year over year.

---

## `app.py` — FastAPI Server & API Routes

### Purpose
The HTTP server. Defines all API endpoints that the React frontend calls. Also manages the in-memory cache.

### In-Memory Cache
```python
_cache: Dict[str, Any] = {}     # stores the results
_cache_ts: Dict[str, float] = {} # stores when each was cached
CACHE_TTL = 300  # 5 minutes
```

**Why:** Each API call triggers a MySQL fetch + Python calculations. On the default view (no filters), the results are always the same. Caching means the second load returns instantly instead of re-querying MySQL.

**How it works:**
1. Request comes in with filters (e.g. `unit=Lakhs, segment=centre`)
2. `make_key("seg", None, "centre", "Lakhs")` → `"seg|None|centre|Lakhs"`
3. `cache_get(key)` checks if this key exists and was cached < 5 min ago
4. Cache HIT → return immediately. Cache MISS → compute, store, return.

**Startup pre-warm** (`@app.on_event("startup")`):
Runs `get_financials()` and caches the most common queries (no filters, Lakhs) the moment uvicorn starts. This means the very first page load is fast, not just subsequent ones.

### API Endpoints

| Endpoint | Method | What it returns |
|----------|--------|-----------------|
| `/` | GET | Health check JSON |
| `/api/filters` | GET | Available years, months, segments, branches |
| `/api/pnl-measures` | GET | Revenue, GP, EBITDA, PAT with % margins |
| `/api/pnl-table` | GET | Year-by-year P&L comparison table |
| `/api/segment-data` | GET | Revenue and gross margin per segment |
| `/api/monthly-trend` | GET | Month-wise revenue, expenses, profit |
| `/api/impact-metrics` | GET | Students, schools, STEM labs, research counts |
| `/api/ai/chat` | POST | Send question, get AI response |
| `/api/reindex` | POST | Force RAG reindex + clear cache |
| `/api/cache/clear` | POST | Clear cache without reindexing |

### Query Parameters
Every data endpoint accepts optional filter parameters:
```
GET /api/pnl-measures?source_year=FY25-26&segment=centre&unit=Crores
```
These are passed through to `get_financials()` which adds them as SQL `WHERE` clauses.

### CORS Middleware
```python
allow_origins=["http://localhost:5173", "*"]
```
Allows the React dev server (port 5173) to call the API (port 8000). The `"*"` is fine for development. Remove it in production and specify your actual frontend domain.

### Error Handling Pattern
Each endpoint wraps logic in `try/except`. On error:
- Prints the error to the uvicorn terminal (for debugging)
- Returns HTTP 500 with the error message
- Frontend shows "Loading data..." or fallback values

---

## `requirements.txt` — Dependencies

```
fastapi          → Web framework, defines routes and request/response models
uvicorn          → ASGI server that runs FastAPI
mysql-connector-python → MySQL driver (DBAPI2, not SQLAlchemy)
python-dotenv    → Loads .env file into os.environ
pydantic         → Data validation for request/response schemas
pandas           → DataFrame operations for financial calculations
groq             → Groq API client (LLaMA model)
chromadb         → Local vector database for RAG
```

`sentence-transformers` is commented out — not needed when using the ONNX embedding backend (the default). Uncomment only if you set `EMBEDDING_BACKEND=sentence_transformers`.

---

## `create_tables.py` & `insert_sample_data.py`

Run once during initial setup:
- `create_tables.py` — creates the `financials` table schema in MySQL
- `insert_sample_data.py` — inserts sample rows so the dashboard has data to display before real data is loaded

After real data is in MySQL, these files are no longer needed for daily use.

## `check_schema.py`

A debugging utility. Run it with `python check_schema.py` to print all column names and types from your database. Useful when something doesn't match expectations.
