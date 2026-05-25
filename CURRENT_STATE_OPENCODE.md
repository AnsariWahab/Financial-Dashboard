# OMOTEC Financial Dashboard — Current State (OpenCode Edition)

## Project Structure

```
Financial-Dashboard/
├── backend/
│   ├── app.py                   # FastAPI backend — all API endpoints
│   ├── database.py              # MySQL connection + get_financials()
│   ├── measures.py              # P&L calculation functions
│   ├── ai_chat.py               # Multi-agent orchestrator (LangGraph + Groq)
│   ├── rag_system.py            # ChromaDB RAG — used by explainer + Q&A memory
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── sql_tool.py          # SQL agent — NL to MySQL query
│   │   ├── calculator_tool.py   # P&L calculator — wraps measures.py
│   │   ├── explainer_tool.py    # RAG explainer — wraps rag_system.py
│   │   └── insights_tool.py     # AI insight generator for dashboard pages
│   └── debug.py                 # DB diagnostic script
├── src/
│   ├── components/
│   │   ├── Overview.tsx          # Main dashboard page
│   │   ├── CentreEconomics.tsx   # Centre segment page
│   │   ├── ResearchEconomics.tsx # Research segment page
│   │   ├── SchoolEconomics.tsx   # School segment page
│   │   ├── ImpactMetrics.tsx     # KPI & social impact page
│   │   ├── InsightsPanel.tsx     # AI-generated insight bullets component
│   │   └── AIChat.tsx            # Multi-turn AI chat panel
│   ├── utils/
│   │   └── pdfGenerator.ts       # PDF report generation (jsPDF)
│   └── services/
│       └── api.ts                # All API call methods + TypeScript interfaces
├── .env                          # VITE_API_URL=http://localhost:8000
├── CURRENT_STATE.md              # Original project state (before changes)
└── CURRENT_STATE_OPENCODE.md     # THIS FILE — updated state after changes
```

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19 + TypeScript + Vite            |
| Styling    | Tailwind CSS 4                          |
| Charts     | Recharts (ComposedChart everywhere)     |
| Icons      | Lucide React                            |
| Backend    | FastAPI (Python)                        |
| Database   | MySQL — table: `financials`             |
| AI Agents  | LangGraph + LangChain + OpenRouter       |
| LLM        | `openai/gpt-4o-mini` via OpenRouter API   |
| RAG        | ChromaDB + ONNX embedder (75+ documents + Q&A memory) |

---

## Database

**Table:** `financials` (renamed from `omotec_financials`)

**Columns:**
```
source_year       VARCHAR   — FY25_26 (underscores, NOT hyphens)
month             DATE      — last day of month e.g. 2025-04-30
segment           VARCHAR   — research | school | centre | indirect | '' (blank = company-level)
branch            VARCHAR   — Pune | Powai | Malad | Juhu | Laxmi | Delhi | SOBO | CNMS | GK Gurukul
                              NULL branch = research/school data (valid, never exclude)
                              No rows have branch = 'ALL'
pnl_categories    VARCHAR   — Revenue | Direct Expense | Indirect Expense | Depreciation | Interest | Tax
value             DECIMAL   — raw rupees (not Lakhs, not Crores)
Student_name      VARCHAR   — school/student name
school_type       VARCHAR   — STEM LAB etc.
research_category VARCHAR   — Research Paper | Research Competition
```

**Available years:** FY22-23, FY23-24, FY24-25, FY25-26

---

## Backend — API Endpoints

All endpoints in `backend/app.py`. Base URL: `http://localhost:8000`

| Endpoint                          | Params                                    | Returns                                  |
|-----------------------------------|-------------------------------------------|------------------------------------------|
| `GET /`                           | —                                         | Health check                             |
| `GET /api/filters`                | —                                         | years, months, segments, branches        |
| `GET /api/pnl-measures`           | source_year, month, segment, branch, unit | Full P&L dict                            |
| `GET /api/pnl-table`              | source_year, month, segment, branch, unit | Multi-year P&L table                     |
| `GET /api/segment-data`           | source_year, month, unit                  | Revenue + grossMargin per segment        |
| `GET /api/branch-data`            | source_year, segment, unit                | Revenue + grossMargin per branch         |
| `GET /api/monthly-trend`          | source_year, segment, branch, unit        | Revenue + grossMargin per month          |
| `GET /api/impact-metrics`         | source_year, month, segment, branch       | Students, schools, STEM, research counts |
| `GET /api/research-category-data` | source_year, unit                         | Revenue + grossMargin per research cat   |
| `GET /api/top-schools`            | source_year, unit                         | Top 10 schools by revenue                |
| `GET /api/monthly-student-trend`  | source_year                               | Student count per month                  |
| `POST /api/ai/chat`               | {message, history, filters}               | AI agent response + Q&A memory           |
| `POST /api/cache/clear`           | —                                         | Clears in-memory cache                   |
| `POST /api/reindex`               | —                                         | Re-indexes RAG + clears cache + Q&A memory |

**Important notes (from debugging):**
- All endpoints use 5-minute in-memory cache (`_cache` dict)
- `unit` param: `Lakhs` = divisor 100000, `Crores` = divisor 10000000
- `source_year` hyphen→underscore conversion happens in `database.py` `get_financials()`
- PnL_Calculator returns full breakdown for company-wide, Gross-Margin-only for individual segments

---

## Multi-Agent AI System

### Architecture

```
User Question
      ↓
   ai_chat.py — LangGraph ReAct Orchestrator (gpt-4o-mini via OpenRouter)
      ↓
  [Q&A Memory: retrieve similar past Q&As from ChromaDB]
      ↓
  Decides which tool to call based on question type
      ↓
  ┌─────────────────┬──────────────────┬───────────────────┐
  │  SQL_Database   │  PnL_Calculator  │ Financial_Explainer│
  │  sql_tool.py    │calculator_tool.py│ explainer_tool.py  │
  │                 │                  │                    │
  │ Generates MySQL │ Calls measures.py│ Searches ChromaDB  │
  │ query, runs it, │ for exact P&L    │ RAG for conceptual │
  │ returns results │ metrics          │ questions          │
  └─────────────────┴──────────────────┴───────────────────┘
      ↓
  [Q&A Memory: store this Q&A for future]
      ↓
  Synthesises final answer to user
```

### Models

| Role | Model | Provider |
|------|-------|----------|
| Orchestrator | `openai/gpt-4o-mini` | OpenRouter (pay-as-you-go) |
| SQL Generation | `openai/gpt-4o-mini` | OpenRouter (pay-as-you-go) |
| Insights | `openai/gpt-4o-mini` | OpenRouter (pay-as-you-go) |

**Previous setup (for reference):**
- All models used `meta-llama/llama-4-scout-17b-16e-instruct` via Groq (free tier, 30K TPM)
- Migrated to OpenRouter for broader model selection and pay-as-you-go pricing

### Tool Routing Rules (Updated)

| Question Type | Tool Used | Example |
|---|---|---|
| Revenue, expenses, counts | SQL_Database | "What is total revenue for FY25-26?" |
| Margins, P&L, PNL, EBITDA%, PAT% | PnL_Calculator | "What is gross margin for centre?" |
| Concepts, explanations | Financial_Explainer | "What is EBITDA?" |
| Fallback | Financial_Explainer | When SQL returns no results |

Note: Both `PNL` and `P&L` now trigger PnL_Calculator correctly.

---

## Q&A Memory (Implemented)

### How It Works

1. **Storage:** After each successful chat, the question + answer is stored in ChromaDB with `type: "qa_pair"`
2. **Retrieval:** Before processing a new question, similar past Q&As are retrieved via semantic search
3. **Injection:** Retrieved Q&As are injected as reference context for the LLM
4. **Deduplication:** Duplicate questions are detected by content hash and skipped (no duplicate storage)

### Files Changed

- `backend/rag_system.py` — Added `store_qa()` and `retrieve_qa()` methods with `type: "qa_pair"` metadata
- `backend/ai_chat.py` — Added Q&A retrieval before agent call, storage after success

### Removal Options

| Method | Command | Effect |
|--------|---------|--------|
| Reindex | `POST /api/reindex` | Clears everything in RAG (financial docs + Q&A) |
| Delete chroma_db | Delete `backend/chroma_db/` folder | Full reset, regenerated on restart |
| Revert code | `git checkout main` | Reverts all changes (but keeps Q&A if DB exists) |

---

## PnL_Calculator Behavior (Updated)

- **Company-wide (no segment filter):** Returns full P&L breakdown through to PAT
- **Individual segment (research/school/centre):** Returns only up to Gross Margin line
- This matches the rule: segment-level data only needs Revenue, Direct Expense, Gross Profit

---

## .gitignore Changes

Added `chroma_db/` to `.gitignore` — autogenerated vector DB files should not be committed.

---

## Branches

| Branch | Description |
|--------|-------------|
| `main` | Stable version with OpenRouter + gpt-4o-mini |

Get an OpenRouter API key at https://openrouter.ai/keys and set `OPENROUTER_API_KEY` in `backend/.env`

---

## Running the Project

```bash
# Backend (from /backend directory)
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt --prefer-binary
uvicorn app:app --reload --reload-exclude venv

# Frontend (from root directory)
npm install
npm run dev
```

**Backend:** `http://localhost:8000`
**Frontend:** `http://localhost:5173`

---

## Known Issues / TODO

- [x] Switched orchestrator from 70B to Llama 4 Scout (30K TPM vs 6K TPM)
- [x] Fixed unit conversion (1 Crore = 100 Lakhs)
- [x] Added PNL routing to PnL_Calculator
- [x] Segment P&L now truncated to Gross Margin line
- [x] Added Q&A Memory via ChromaDB
- [x] Excluded `chroma_db/` from git tracking
- [x] Excluded `venv/` from uvicorn reload
- [ ] `CORS allow_origins = ["*"]` — restrict to frontend URL in production
- [ ] `mockData.ts` still in `src/data/` — unused, kept for reference
- [ ] Research + School pages fetch some endpoints via raw `fetch()` not `api.ts` — could be moved
- [ ] No authentication on any endpoint
- [x] Loading skeletons replaced "Loading..." text on all 5 pages
- [x] Auto-retry on 429 rate limits (3 attempts with 10s/20s backoff)
- [x] PDF Export button on every page (via `pdfGenerator.ts`)
- [x] Dark Mode toggle (persisted in localStorage)
- [x] Fixed March FY24_25 duplicate row — `UPDATE financials SET source_year='FY23_24' WHERE month='2024-03-31' AND source_year='FY24_25'`

---

## PDF Export (New Feature)

### How It Works
Each page has a **Download PDF** button in its filter bar. Clicking it generates a clean PDF report of the current page data using `jsPDF`.

### Key Files
- `src/utils/pdfGenerator.ts` — `generateExecutiveSummaryPDF()` function using mockData (static report)

### Pages with PDF Export
| Page | Data Included |
|------|---------------|
| Overview | P&L, Segment Performance, Monthly Trend, Impact Metrics |
| Centre Economics | P&L, Monthly Trend, Branch Performance |
| Research Economics | P&L, Monthly Trend |
| School Economics | P&L, Monthly Trend, Impact Metrics |
| Impact Metrics | Impact Metrics only |

### Behavior
- Segment pages show only Revenue → Gross Profit (not full P&L)
- Auto-pagination for multi-page reports
- Footer: "Page X of Y | Title | Year"
- Saved as `Page-Name-Year.pdf`

### Note
The current `pdfGenerator.ts` generates a static executive summary from mock data, not dynamic page-specific PDFs. An improved version using live API data would replace it in production.

---

## Dark Mode (Implemented)

### How It Works
- Sun/Moon toggle button in the header (next to AI Assistant)
- State saved in `localStorage` (survives refresh)
- Toggles `dark` class on `<html>` element
- Tailwind v4 `@custom-variant dark (&:where(.dark, .dark *))` in `index.css`

### Files Changed
| File | Change |
|------|--------|
| `src/index.css` | Added `@custom-variant dark` directive |
| `src/App.tsx` | Dark mode state, toggle, localStorage, `dark:` classes on shell |
| `src/components/*.tsx` (7 files) | `dark:` variants for all pages + InsightsPanel + AIChat |

### Coverage
| Element | Light | Dark |
|---------|-------|------|
| Page background | `bg-gray-50` | `bg-gray-900` |
| Card backgrounds | `bg-white` | `bg-gray-800` |
| Headings | `text-gray-900` | `text-gray-100` |
| Body text | `text-gray-700` | `text-gray-300` |
| Labels | `text-gray-500` | `text-gray-400` |
| Borders | `border-gray-100/200` | `border-gray-700` |
| Header | Blue gradient | Darker blue gradient |
| Chat bubbles | `bg-blue-500` | `bg-blue-600` |
| Table headers | `bg-gray-50` | `bg-gray-700` |
| Filter selects | `bg-white border-gray-200` | `bg-gray-700 border-gray-600` |

---

## UI Polish (Latest)

### Centre Economics — Branch Filter
- Excluded branches on branch chart: `Lokhandwala`, `Pune - CNMS`, `Pune - GK Gurukul`
- Only applies to FY25-26; other years show all branches

### Research Economics — Patent Merge
- `research_category` normalised to Title Case in backend (`app.py:343`)
- `PATENT` and `Patent` categories now merge into a single `Patent` entry

### School Economics — Chart Styling
- Monthly chart: Revenue bars changed from orange (`#f97316`) to blue (`#3b82f6`) to distinguish from the Gross Margin % line
- Top 10 Schools chart: height increased to 400px, YAxis width 140px, left margin 20px to prevent overlapping school names

---

## AI Insights Panel (New Feature)

### Overview
Replaces the static "Key Insights" / "Insights" sections on all 4 main pages with AI-generated narrative insights.

### How It Works
1. Each page renders `<InsightsPanel sourceYear={...} segment="..." unit="..." />`
2. Panel fetches from `GET /api/insights?source_year=...&segment=...&unit=...`
3. Backend gathers rich metrics and calls Groq LLM
4. LLM returns 3-5 short (<20 words) business-friendly bullets with emojis
5. Response is cached in-memory (300s TTL)
6. Shows skeleton loading while fetching; renders nothing on error

### Files
| File | Purpose |
|------|---------|
| `backend/agents/insights_tool.py` | LLM-powered insight generator using Groq |
| `backend/app.py:527` | `GET /api/insights` endpoint |
| `src/components/InsightsPanel.tsx` | React component with loading state |
| Overview, Centre, Research, School .tsx | Old insights replaced with `<InsightsPanel>` |

### Data feeding the LLM

| Data | Overview | Centre | School | Research |
|------|----------|--------|--------|----------|
| Revenue, GP%, EBITDA%, PAT% | ✅ | ✅ | ✅ | ✅ |
| YoY revenue change + prev GP% | ✅ | ✅ | ✅ | ✅ |
| Last 3 months GP trend (direction) | ✅ | ✅ | ✅ | ✅ |
| Per-segment breakdown | ✅ all 3 | — | — | — |
| Branch outliers (best/worst GP%) | — | ✅ | — | — |
| Student count + rev/student YoY | — | — | ✅ | — |
| Top vs bottom school gap (× multiple) | — | — | ✅ | — |
| Category breakdown + YoY margin | — | — | — | ✅ |

### Response Format
The LLM returns a JSON array of `{text, severity}` objects that the frontend renders as styled bullet cards with color-coded severity (green=positive, amber=caution, red=warning). Previously returned a plain string — fixed.

---

## P&L Table Truncation

Centre, Research, and School pages now show P&L only to **Gross Margin** (Revenue → Direct Expense → Gross Profit). Overview retains the full P&L down to PAT.

---

## Branch Filter — Case-Insensitive

The branch exclusion filter in Centre Economics now uses case-insensitive matching. DB has both `Lokhandwala` and `LOKHANDWALA` — both are now excluded.

---

## Known Issues / Future Improvements

- [ ] `CORS allow_origins = ["*"]` — restrict to frontend URL in production
- [ ] No authentication on any endpoint
- [ ] `pdfGenerator.ts` uses mockData instead of live API data — should be updated for dynamic page-specific PDFs
- [x] Loading skeletons replaced "Loading..." text on all 5 pages
- [x] Auto-retry on 429 rate limits (3 attempts with 10s/20s backoff)
- [x] PDF Export button on every page
- [x] Dark Mode toggle (persisted in localStorage, full coverage across all components)
- [x] Fixed March FY24_25 duplicate row — `UPDATE financials SET source_year='FY23_24' WHERE month='2024-03-31' AND source_year='FY24_25'`
- [x] `month` column case normalised in `get_financials()` (DB has `Month` uppercase)
- [x] Monthly chart data fixed via `_parse_month_col()` helper
- [x] AI Insights Panel replaces static insights (returns structured JSON, properly parsed and rendered)
- [x] Centre/Research/School P&L tables truncated to Gross Margin
- [x] Q&A Memory via ChromaDB (store/retrieve similar past conversations)
- [x] `mockData.ts` still in `src/data/` — unused, kept for reference
- [x] Research + School pages fetch some endpoints via raw `fetch()` not `api.ts` — **DONE**
