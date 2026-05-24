# OMOTEC Financial Dashboard — Current State

## Project Structure

```
Financial-Dashboard/
├── backend/
│   ├── app.py                   # FastAPI backend — all API endpoints
│   ├── database.py              # MySQL connection + get_financials()
│   ├── measures.py              # P&L calculation functions
│   ├── ai_chat.py               # Multi-agent orchestrator (LangGraph)
│   ├── rag_system.py            # ChromaDB RAG — used by explainer agent
│   ├── agents/
│   │   ├── __init__.py
│   │   ├── sql_tool.py          # SQL agent — NL to MySQL query
│   │   ├── calculator_tool.py   # P&L calculator — wraps measures.py
│   │   └── explainer_tool.py    # RAG explainer — wraps rag_system.py
│   └── debug.py                 # DB diagnostic script
├── src/
│   ├── components/
│   │   ├── Overview.tsx          # Main dashboard page
│   │   ├── CentreEconomics.tsx   # Centre segment page
│   │   ├── ResearchEconomics.tsx # Research segment page
│   │   ├── SchoolEconomics.tsx   # School segment page
│   │   └── ImpactMetrics.tsx     # KPI & social impact page
│   └── services/
│       └── api.ts                # All API call methods + TypeScript interfaces
├── .env                          # VITE_API_URL=http://localhost:8000
└── backend/.env                  # DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT
```

---

## Tech Stack

| Layer      | Technology                              |
|------------|-----------------------------------------|
| Frontend   | React 19 + TypeScript + Vite            |
| Styling    | Tailwind CSS                            |
| Charts     | Recharts (ComposedChart everywhere)     |
| Icons      | Lucide React                            |
| Backend    | FastAPI (Python)                        |
| Database   | MySQL — table: `omotec_financials`      |
| AI Agents  | LangGraph + LangChain + Groq            |
| LLM        | llama-3.3-70b-versatile via Groq API   |
| RAG        | ChromaDB + ONNX embedder (75 documents) |

---

## Database

**Table:** `omotec_financials`

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

**Known data issues:**
- `source_year` uses underscores in DB (`FY24_25`) but frontend sends hyphens (`FY24-25`)
  → Fixed in `database.py`: `source_year = source_year.replace('-', '_')` at top of `get_financials()`
- `month` column is `datetime.date` object — must use `pd.to_datetime()` before `.dt.strftime()`
- One stray row: `month = 2024-03-31` tagged as `FY24_25` — should be `FY23_24`
  → Fix: `UPDATE omotec_financials SET source_year='FY23_24' WHERE month='2024-03-31' AND source_year='FY24_25'`
- Blank segment (`''`) rows contain Depreciation and Interest — company-level entries
  → Do NOT filter `segment != ''` on total/overall queries — only filter when a specific segment is requested
- `branch = 'ALL'` rows DO NOT EXIST in FY25_26 — confirmed by SQL
- NULL branch rows = research/school segment data (valid revenue data)
  → NEVER use `branch != 'ALL'` filter — it accidentally excludes NULL branch rows

**Revenue verification (FY25_26):**
```
school:   ₹607.20 Lakhs
centre:   ₹376.49 Lakhs
research: ₹571.67 Lakhs
Total:    ₹1,555.36 Lakhs  ✅
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
| `POST /api/ai/chat`               | {message, history, filters}               | AI agent response                        |
| `POST /api/cache/clear`           | —                                         | Clears in-memory cache                   |
| `POST /api/reindex`               | —                                         | Re-indexes RAG + clears cache            |

**Important notes:**
- All endpoints use 5-minute in-memory cache (`_cache` dict)
- `startup_prewarm()` runs `cache_clear()` first, then pre-warms segment + PnL data
- `unit` param: `Lakhs` = divisor 100000, `Crores` = divisor 10000000
- `source_year` hyphen→underscore conversion happens in `database.py` `get_financials()`
- Research counts in `get_impact_metrics` always pull from `segment='research'` rows regardless of segment filter

---

## Multi-Agent AI System

### Architecture

```
User Question
      ↓
  ai_chat.py — LangGraph ReAct Orchestrator (llama-3.3-70b)
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
  Synthesises final answer to user
```

### Tool Routing Logic

| Question Type | Tool Used | Example |
|---|---|---|
| Revenue, expenses, counts | SQL_Database | "What is total revenue for FY25-26?" |
| Margins, EBITDA%, PAT% | PnL_Calculator | "What is gross margin for centre?" |
| Concepts, explanations | Financial_Explainer | "What is EBITDA?" |
| Fallback | Financial_Explainer | When SQL returns no results |

### Key Files

**`ai_chat.py`** — Orchestrator
- Uses `langgraph.prebuilt.create_react_agent` (LangChain 1.3+ / LangGraph)
- Tools defined as `StructuredTool` with Pydantic schemas (required for Groq compatibility)
- ReAct loop: Thought → Action → Observation → Final Answer
- `recursion_limit: 8` prevents infinite tool-call loops
- History passed as real `HumanMessage`/`AIMessage` objects on every call
- Enriches questions with dashboard filter context (year, segment, unit)

**`agents/sql_tool.py`** — SQL Agent
- Uses `llama-3.1-8b-instant` (fast, sufficient for SQL generation)
- Includes full DB schema, column values, and guardrails in system prompt
- Safety check blocks DROP/DELETE/UPDATE/INSERT before execution
- Key rules in prompt:
  - Never use `branch != 'ALL'` (drops NULL rows)
  - Only filter segment when question specifies one
  - Always convert value inside SQL (divide by 100000 for Lakhs)
  - Always alias result columns (AS revenue_lakhs)

**`agents/calculator_tool.py`** — P&L Calculator
- Parses filters from plain text or JSON input
- Calls `get_financials()` + `get_all_pnl_measures()` directly
- Returns full P&L breakdown formatted as string

**`agents/explainer_tool.py`** — RAG Explainer
- Calls `rag.retrieve()` from existing `rag_system.py`
- Filters to relevance score > 0.3 before returning
- Used for conceptual questions and as fallback

### Groq Rate Limits (Free Tier)

| Model | TPM | TPD | Use |
|---|---|---|---|
| llama-3.3-70b-versatile | 6,000 | 100,000 | Orchestrator |
| llama-3.1-8b-instant | 30,000 | 500,000 | SQL generation |

---

## Frontend — api.ts Interfaces

```typescript
PnLMeasures     // Revenue, Direct Expense, Gross Profit, Gross Profit %,
                // EBITDA, EBITDA %, Depreciation, EBIT, Interest, PBT, Tax, PAT, PAT %
SegmentData     // segment, revenue, grossMargin
BranchData      // branch, revenue, grossMargin
MonthlyTrend    // month, revenue, grossMargin
ImpactMetrics   // uniqueStudents, uniqueSchools, stemLabs,
                // researchPapers, researchCompetitions, researchCount
Filters         // years, months, segments, branches, units
ApiFilters      // source_year, month, segment, branch, unit
```

---

## Pages — What Each Does

### Overview.tsx
- **Filters:** Year (default FY25-26) + Unit (Lakhs/Crores)
- **KPI Cards:** Revenue, Gross Profit %, EBITDA %, PAT, Unique Students
- **P&L Summary Table:** Full P&L with % column, red for negatives
- **Segment-wise Performance:** ComposedChart — Revenue bars + Gross Margin % line (dual Y)
- **Monthly Revenue & Gross Margin:** Same chart, April–March (12 months)
- **Silent refresh:** `refreshing` state — no page blank on filter change

### CentreEconomics.tsx
- **Fixed segment:** `centre`
- **Filters:** Year + Unit
- **KPI Cards:** Revenue, Gross Profit %, EBITDA %, PAT
- **P&L Summary Table**
- **Monthly Revenue & Gross Margin Chart**
- **Branch-wise Performance Chart:** branch on X axis
- **Branch exclusion for FY25-26:** Lokhandwala, CNMS, GK Gurukul hidden (frontend filter)

### ResearchEconomics.tsx
- **Fixed segment:** `research`
- **Filters:** Year + Unit
- **KPI Cards:** Revenue, Gross Profit %, EBITDA %, PAT
- **P&L Summary Table**
- **Monthly Revenue & Gross Margin Chart** (purple)
- **Research Category Performance Chart:** `/api/research-category-data`

### SchoolEconomics.tsx
- **Fixed segment:** `school`
- **Filters:** Year + Unit
- **KPI Cards:** Revenue, Gross Profit %, Unique Students, Unique Schools, STEM Labs
- **P&L Summary Table**
- **Monthly Revenue & Gross Margin Chart** (orange)
- **Top 10 Schools by Revenue:** Horizontal BarChart — `/api/top-schools`

### ImpactMetrics.tsx
- **Filters:** Year only
- **Large KPI Cards:** Students, Schools, STEM Labs, Research Papers, Competitions
- **Year-over-Year Table:** Current vs previous year with ▲▼ % change
- **Monthly Student Activity Line Chart:** `/api/monthly-student-trend`
- **YoY Bar Chart:** Side-by-side bars current vs previous year

---

## Chart Pattern (Used Everywhere)

```tsx
<ComposedChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="fieldName" />
  <YAxis yAxisId="left"
    domain={[(min) => min < 0 ? Math.floor(min * 1.1) : 0, (max) => Math.ceil(max * 1.1)]}
    label={{ value: `₹ (${unit})`, angle: -90, position: 'insideLeft' }}
  />
  <YAxis yAxisId="right" orientation="right"
    tickFormatter={(v) => `${v}%`} domain={['auto','auto']}
    label={{ value: 'Gross Margin %', angle: 90, position: 'insideRight' }}
  />
  <Tooltip formatter={(value, name) =>
    name === 'Gross Margin %' ? [`${value}%`, name] : [`₹${value}`, name]
  } />
  <Legend />
  <Bar yAxisId="left" dataKey="revenue" fill="#3b82f6">
    <LabelList position="top" formatter={(v) => `₹${v.toFixed(1)}`} />
  </Bar>
  <Line yAxisId="right" dataKey="grossMargin" stroke="#f59e0b" dot={{ r: 5 }}
    label={{ position: 'top', formatter: (v) => `${v.toFixed(1)}%` }}
  />
</ComposedChart>
```

---

## Running the Project

```bash
# Backend (from /backend directory)
python -m venv venv
venv\Scripts\activate          # Windows
pip install -r requirements.txt --prefer-binary
uvicorn app:app --reload

# Frontend (from root directory)
npm install
npm run dev
```

**Backend:** `http://localhost:8000`
**Frontend:** `http://localhost:5173`

---

## Known Issues / TODO

- [ ] Switch orchestrator back to `llama-3.3-70b-versatile` after daily limit resets
- [ ] `CORS allow_origins = ["*"]` — restrict to frontend URL in production
- [ ] `mockData.ts` still in `src/data/` — unused, kept for reference
- [ ] Research + School pages fetch some endpoints via raw `fetch()` not `api.ts` — could be moved
- [ ] No authentication on any endpoint
- [ ] No loading skeleton — just plain "Loading..." text
- [ ] March FY24_25 duplicate row in DB (stray `2024-03-31`) — run the UPDATE fix

---

## How to Start a New Chat

1. Paste the contents of this `CURRENT_STATE.md` file
2. Paste the specific component or backend file you want to work on
3. Claude cannot fetch raw GitHub files directly — paste file contents manually

GitHub repo: **https://github.com/AnsariWahab/Financial-Dashboard**