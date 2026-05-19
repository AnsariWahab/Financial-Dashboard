# OMOTEC Financial Dashboard — Current State

## Project Structure

Financial-Dashboard/
├── backend/
│   ├── app.py           # FastAPI backend — all API endpoints
│   ├── database.py      # MySQL connection + get_financials()
│   ├── measures.py      # P&L calculation functions
│   ├── ai_chat.py       # RAG-based AI chat
│   ├── rag_system.py    # ONNX embedder + vector search
│   └── debug.py         # DB diagnostic script
├── src/
│   ├── components/
│   │   ├── Overview.tsx          # Main dashboard page
│   │   ├── CentreEconomics.tsx   # Centre segment page
│   │   ├── ResearchEconomics.tsx # Research segment page
│   │   ├── SchoolEconomics.tsx   # School segment page
│   │   └── ImpactMetrics.tsx     # KPI & social impact page
│   └── services/
│       └── api.ts        # All API call methods + TypeScript interfaces
├── .env                  # VITE_API_URL=http://localhost:8000
└── backend/.env          # DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, DB_PORT

---

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Frontend  | React 19 + TypeScript + Vite        |
| Styling   | Tailwind CSS                        |
| Charts    | Recharts (ComposedChart everywhere) |
| Icons     | Lucide React                        |
| Backend   | FastAPI (Python)                    |
| Database  | MySQL — table: `omotec_financials`  |
| AI Chat   | RAG with ONNX embedder              |

---

## Database

**Table:** `omotec_financials`

**Columns:**

source_year       VARCHAR   — e.g. FY25_26 (underscores, NOT hyphens)
month             DATE      — last day of month e.g. 2025-04-30
segment           VARCHAR   — research | school | centre | indirect
branch            VARCHAR   — Pune | Powai | Malad | Juhu | Laxmi | Delhi | ALL | etc.
pnl_categories    VARCHAR   — Revenue | Direct Expense | Indirect Expense | Depreciation | Interest | Tax
value             DECIMAL
Student_name      VARCHAR   — used for school/research student counts
school_type       VARCHAR   — STEM LAB etc.
research_category VARCHAR   — Research Paper | Research Competition


**Known data issues:**
- `source_year` uses underscores in DB (`FY24_25`) but frontend sends hyphens (`FY24-25`)
  → Fixed in `database.py`: `source_year = source_year.replace('-', '_')` at top of `get_financials()`
- `month` column is `datetime.date` object, NOT a string — must use `pd.to_datetime()` before `.dt.strftime()`
- One stray row: `month = 2024-03-31` tagged as `FY24_25` — should be `FY23_24`
  → Fix: `UPDATE omotec_financials SET source_year='FY23_24' WHERE month='2024-03-31' AND source_year='FY24_25'`
- `segment = ''` and `branch = ''` empty string rows exist — filtered out in all endpoints
- `branch = 'ALL'` rows exist — excluded from branch-level calculations to avoid double counting

**Available years:** FY22-23, FY23-24, FY24-25, FY25-26

---

## Backend — API Endpoints

All endpoints in `backend/app.py`. Base URL: `http://localhost:8000`

| Endpoint                        | Params                                      | Returns                              |
|---------------------------------|---------------------------------------------|--------------------------------------|
| `GET /`                         | —                                           | Health check                         |
| `GET /api/filters`              | —                                           | years, months, segments, branches    |
| `GET /api/pnl-measures`         | source_year, month, segment, branch, unit   | Full P&L dict                        |
| `GET /api/pnl-table`            | source_year, month, segment, branch, unit   | Multi-year P&L table                 |
| `GET /api/segment-data`         | source_year, month, unit                    | Revenue + grossMargin per segment    |
| `GET /api/branch-data`          | source_year, segment, unit                  | Revenue + grossMargin per branch     |
| `GET /api/monthly-trend`        | source_year, segment, branch, unit          | Revenue + grossMargin per month      |
| `GET /api/impact-metrics`       | source_year, month, segment, branch         | Students, schools, STEM, research    |
| `GET /api/research-category-data` | source_year, unit                         | Revenue + grossMargin per research category |
| `GET /api/top-schools`          | source_year, unit                           | Top 10 schools by revenue            |
| `GET /api/monthly-student-trend`| source_year                                 | Student count per month              |
| `POST /api/ai/chat`             | {message, history, filters}                 | AI response                          |
| `POST /api/cache/clear`         | —                                           | Clears in-memory cache               |
| `POST /api/reindex`             | —                                           | Re-indexes RAG + clears cache        |

**Important notes:**
- All endpoints use 5-minute in-memory cache (`_cache` dict)
- `startup_prewarm()` runs `cache_clear()` first, then pre-warms segment + PnL data
- `unit` param: `Lakhs` = divisor 100000, `Crores` = divisor 10000000
- `source_year` hyphen→underscore conversion happens in `database.py` `get_financials()`
- Research counts in `get_impact_metrics` always pull from `segment='research'` rows regardless of segment filter

---

## Frontend — api.ts Interfaces

```typescript
PnLMeasures       // Revenue, Direct Expense, Gross Profit, Gross Profit %, EBITDA,
                  // EBITDA %, Depreciation, EBIT, Interest, PBT, Tax, PAT, PAT %
SegmentData       // segment, revenue, grossMargin
BranchData        // branch, revenue, grossMargin
MonthlyTrend      // month, revenue, grossMargin
ImpactMetrics     // uniqueStudents, uniqueSchools, stemLabs, researchPapers,
                  // researchCompetitions, researchCount
Filters           // years, months, segments, branches, units
ApiFilters        // source_year, month, segment, branch, unit
```

**API methods:** `getFilters`, `getPnLMeasures`, `getPnLTable`, `getSegmentData`,
`getBranchData`, `getMonthlyTrend`, `getImpactMetrics`, `healthCheck`

---

## Pages — What Each Does

### Overview.tsx
- **Filters:** Year dropdown (default: FY25-26) + Unit dropdown (Lakhs/Crores)
- **KPI Cards:** Revenue, Gross Profit %, EBITDA %, PAT, Unique Students (5 cards)
- **P&L Summary Table:** Full P&L with % column, red for negatives
- **Segment-wise Performance Chart:** ComposedChart — Revenue bars (left Y) + Gross Margin % line (right Y), data labels on both
- **Monthly Revenue & Gross Margin Chart:** Same ComposedChart style, April–March (12 months), grouped across years
- **Key Insights:** Dynamic text summary
- **Silent refresh:** `refreshing` state — no full page blank on filter change, only on first load

### CentreEconomics.tsx
- **Fixed segment:** `centre`
- **Filters:** Year + Unit
- **KPI Cards:** Revenue, Gross Profit %, EBITDA %, PAT
- **P&L Summary Table**
- **Monthly Revenue & Gross Margin Chart**
- **Branch-wise Performance Chart:** Same ComposedChart, branch on X axis
- **Branch exclusion:** Lokhandwala, CNMS, GK Gurukul hidden for FY25-26 only (frontend filter `filteredBranchData`)
- **Insights box:** Shows active branch count + top branch by revenue

### ResearchEconomics.tsx
- **Fixed segment:** `research`
- **Filters:** Year + Unit
- **KPI Cards:** Revenue, Gross Profit %, EBITDA %, PAT
- **P&L Summary Table**
- **Monthly Revenue & Gross Margin Chart** (purple bars)
- **Research Category Performance Chart:** `/api/research-category-data` — category on X axis
- **Insights box:** Active categories + top category by revenue

### SchoolEconomics.tsx
- **Fixed segment:** `school`
- **Filters:** Year + Unit
- **KPI Cards:** Revenue, Gross Profit %, Unique Students, Unique Schools, STEM Labs (5 cards)
- **P&L Summary Table**
- **Monthly Revenue & Gross Margin Chart** (orange bars)
- **Top 10 Schools by Revenue:** Horizontal BarChart (`layout="vertical"`), `/api/top-schools`
- **Insights box:** Financial + impact metrics + top school name

### ImpactMetrics.tsx
- **Filters:** Year only (no Unit — counts not money)
- **Large KPI Cards:** Unique Students, Unique Schools, STEM Labs, Research Papers, Research Competitions
- **Year-over-Year Table:** Current vs previous year with ▲▼ % change for all 5 metrics
- **Monthly Student Activity Line Chart:** `/api/monthly-student-trend`
- **YoY Bar Chart:** Side-by-side bars current vs previous year
- **Impact Banner:** Total numbers across all metrics

---

## Chart Pattern (Used Everywhere)

All charts follow this exact pattern:

```tsx
<ComposedChart data={data}>
  <CartesianGrid strokeDasharray="3 3" />
  <XAxis dataKey="fieldName" />
  
  {/* Left Y — Revenue in ₹ */}
  <YAxis yAxisId="left"
    domain={[(min) => min < 0 ? Math.floor(min * 1.1) : 0, (max) => Math.ceil(max * 1.1)]}
  />
  
  {/* Right Y — Gross Margin % */}
  <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => `${v}%`} domain={['auto','auto']} />
  
  <Tooltip formatter={(value, name) => name === 'Gross Margin %' ? [`${value}%`, name] : [`₹${value}`, name]} />
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
pip install -r requirements.txt
uvicorn app:app --reload

# Frontend (from root directory)
npm install
npm run dev
```

**Backend runs on:** `http://localhost:8000`
**Frontend runs on:** `http://localhost:5173`

---

## Known Issues / TODO

- [ ] `CORS allow_origins = ["*"]` — restrict to frontend URL in production
- [ ] `mockData.ts` still exists in `src/data/` — unused, kept for reference
- [ ] `impactData` fetched without `source_year` in some older components — check if all pages pass year filter
- [ ] March FY24_25 duplicate row in DB (stray `2024-03-31`) — run the UPDATE fix above
- [ ] Research page fetches `/api/research-category-data` via raw fetch not `api.ts` method — could be moved to api.ts
- [ ] School page fetches `/api/top-schools` via raw fetch — same as above
- [ ] No authentication on any endpoint
- [ ] No loading skeleton — just plain "Loading..." text

---

## How to Start a New Chat

1. Share this link: **https://github.com/AnsariWahab/Financial-Dashboard**
2. Say: *"Read the CURRENT_STATE.md from my repo"*
3. Paste the specific file you want to work on

Claude can read the README and CURRENT_STATE.md from GitHub but **cannot fetch individual source files** directly. For source files, paste the relevant component or backend file into the chat.