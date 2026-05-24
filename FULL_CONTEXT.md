# Full Context Document — Wahabuddin Ansari
*Paste this at the start of any new Claude chat to restore full context.*

---

## Who I Am

**Name:** Wahabuddin Ansari  
**Role:** Data Analyst  
**Location:** Mumbai, India  
**Current Company:** ONMYOWNTECHNOLOGY (May 2025 – Present)  
**Previous:** Business Analyst at HRMantra Software Pvt. Ltd. (Dec 2022 – Mar 2025)  
**Current CTC:** ₹4 LPA  
**Education:** M.Sc. Mathematics — Institute of Science, Mumbai  
**Portfolio:** https://wahab-ansari.vercel.app/  
**GitHub:** https://github.com/AnsariWahab  
**Email:** wahabuddinansari69@gmail.com  
**Phone:** +91 9167637128  

---

## Active Job Application

**Company:** Integrity National Corporation  
**Role:** Business & AI Analyst  
**Recruiter:** Suraj Vikram Singh (ssingh@integrity-corp.com)  
**Status:** Replied to their questionnaire — awaiting response  
**Their budget:** $1,200/month  
**My expected CTC:** $800/month (open to discussion)  
**Key points from my reply:**
- 3+ years experience
- Built multi-agent AI system (LangGraph, Groq, SQL Agent)
- Proficiency: SQL 9/10, Excel 9/10, Python 8/10, Power BI 8/10, ChatGPT/Claude 8/10
- Open to EST hours (night shift)
- Notice period: less than 30 days

---

## Main Project — Financial Dashboard

**GitHub:** https://github.com/AnsariWahab/Financial-Dashboard  
**Status:** Working and deployed locally — actively being improved

### Tech Stack
| Layer | Technology |
|---|---|
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS |
| Charts | Recharts (ComposedChart — Bar + Line + dual Y-axis) |
| Backend | Python FastAPI |
| Database | MySQL — table: `financials`, DB: `dashboard` |
| AI Agents | LangGraph + LangChain 1.3 + Groq API |
| LLM (Orchestrator) | llama-3.3-70b-versatile |
| LLM (SQL Agent) | llama-3.1-8b-instant |
| RAG | ChromaDB + ONNX embedder (75 indexed documents) |

### Project Structure
```
backend/
├── app.py                  # FastAPI — 13 endpoints
├── database.py             # MySQL connection + get_financials()
├── measures.py             # P&L calculation functions
├── ai_chat.py              # LangGraph multi-agent orchestrator
├── rag_system.py           # ChromaDB RAG (used by explainer agent)
├── agents/
│   ├── sql_tool.py         # NL → MySQL query → execute → return
│   ├── calculator_tool.py  # Wraps measures.py for P&L metrics
│   └── explainer_tool.py   # Wraps RAG for conceptual questions
src/components/
├── Overview.tsx            # Main dashboard (all segments)
├── CentreEconomics.tsx     # Centre segment page
├── ResearchEconomics.tsx   # Research segment page
├── SchoolEconomics.tsx     # School segment page
└── ImpactMetrics.tsx       # KPI & social impact page
src/services/
└── api.ts                  # All API methods + TypeScript interfaces
```

### Database Facts
- **30,000+ rows**, 4 financial years (FY22-23 to FY25-26)
- `source_year` uses **underscores** in DB: `FY25_26` not `FY25-26`
  → Fixed in `database.py`: `source_year.replace('-', '_')` at top of `get_financials()`
- `month` column is `datetime.date` object — use `pd.to_datetime()` before `.dt.strftime()`
- `segment` values: `research`, `school`, `centre`, `indirect`, `''` (blank = company-level Depreciation/Interest)
- `branch` values: Pune, Powai, Malad, Juhu, Laxmi, Delhi, SOBO, Lokhandwala, CNMS, GK Gurukul
- NULL branch rows = research/school data — **never exclude them**
- No rows with `branch = 'ALL'` in FY25_26 — confirmed
- Blank segment rows (`''`) contain Depreciation and Interest — **do not filter on total queries**

**Verified revenue FY25_26:**
- School: ₹607.20 Lakhs, Centre: ₹376.49 Lakhs, Research: ₹571.67 Lakhs
- Total: ₹1,555.36 Lakhs

### All Backend Endpoints
| Endpoint | Returns |
|---|---|
| GET /api/filters | years, months, segments, branches |
| GET /api/pnl-measures | Full P&L dict |
| GET /api/pnl-table | Multi-year P&L table |
| GET /api/segment-data | Revenue + grossMargin per segment |
| GET /api/branch-data | Revenue + grossMargin per branch |
| GET /api/monthly-trend | Revenue + grossMargin per month |
| GET /api/impact-metrics | Students, schools, STEM, research |
| GET /api/research-category-data | Revenue + grossMargin per research category |
| GET /api/top-schools | Top 10 schools by revenue |
| GET /api/monthly-student-trend | Student count per month |
| POST /api/ai/chat | Multi-agent AI response |
| POST /api/cache/clear | Clears in-memory cache |
| POST /api/reindex | Re-indexes RAG + clears cache |

### Multi-Agent AI System
**Three tools — routing logic:**
- `SQL_Database` → single specific metrics (revenue, counts, branch comparisons)
- `PnL_Calculator` → full P&L, gross profit %, EBITDA %, PAT %, margins
- `Financial_Explainer` → conceptual questions, fallback

**Critical rules learned from bugs:**
- PnL_Calculator input must be ONE string: `'Full P&L for centre segment FY25-26 in Lakhs'`
- Never pass separate keys (source_year, segment, unit) to PnL_Calculator — Groq rejects it
- SQL agent uses `llama-3.1-8b-instant`, orchestrator uses `llama-3.3-70b-versatile`
- `recursion_limit: 20` in `agent.invoke()` config
- `MAX_HISTORY_TURNS = 3` to save token budget
- `max_tokens = 500` on orchestrator

**Groq free tier limits:**
- llama-3.3-70b: 100,000 tokens/day, 6,000 TPM
- llama-3.1-8b: 500,000 tokens/day, 30,000 TPM
- Hitting limits frequently during testing — don't run long test sessions

### Known Issues / TODO
- [ ] Revenue from `PnL_Calculator` shows ₹301 instead of ₹376 for centre — `branch != 'ALL'` filter in `measures.py` possibly excluding rows
- [ ] `Financial_Explainer` sometimes fails alone — needs 70B model to route correctly
- [ ] `CORS allow_origins = ["*"]` — restrict in production
- [ ] `mockData.ts` in `src/data/` — unused, kept for reference
- [ ] March FY24_25 duplicate row in DB — run: `UPDATE financials SET source_year='FY23_24' WHERE month='2024-03-31' AND source_year='FY24_25'`
- [ ] Anonymise DB (rename from financials to demo_financials) for portfolio use

### Running the Project
```bash
# Backend (from /backend directory)
venv\Scripts\activate
uvicorn app:app --reload

# Frontend (from root)
npm run dev
```
Backend: http://localhost:8000 | Frontend: http://localhost:5173

---

## Portfolio — wahab-ansari.vercel.app

### Pages
- `index.html` — Main portfolio (About, Skills, Projects, Experience, Contact)
- `pages/project-pl-dashboard.html` — P&L Dashboard case study ✅ Updated
- `pages/project-fraud-detection.html` — Fraud Detection case study
- `pages/project-ga-capstone.html` — Google Analytics Capstone case study

### What Was Updated (This Session)
**`project-pl-dashboard.html`** — fully rewritten content:
- Tags updated to: Python · FastAPI · React · TypeScript · Multi-Agent AI · LangGraph · MySQL
- Problem, Solution, Architecture, Features, AI System sections updated
- New "AI System" section with agent flow diagram
- Stats: 5 pages, 3 agents, 30K+ rows, 100% effort eliminated
- GitHub link corrected to: https://github.com/AnsariWahab/Financial-Dashboard
- Tech sidebar: 13 real technology tags

**`index.html`** — 8 changes made:
- Project card tech badge: FastAPI · React · LangGraph
- Project description updated to reflect full-stack + multi-agent
- Tags: Multi-Agent AI, Full-Stack, LangGraph
- GitHub link corrected to specific repo
- Impact highlight card updated (removed Streamlit)
- Marquee: added FastAPI, React, LangGraph, MySQL
- Skills: added FastAPI · LangChain · LangGraph proficiency bar at 78%
- Experience timeline: updated ONMYOWNTECHNOLOGY bullet

### Resume Status
- **Current resume** still shows "Python/Streamlit" for P&L Dashboard
- **Needs updating to:** "Built full-stack P&L dashboard (FastAPI, React, MySQL) with multi-agent AI assistant (LangGraph, Groq) — eliminated 100% manual reporting effort across 4 business segments"

---

## Documents Created This Session

1. `CURRENT_STATE.md` — Full technical reference for the dashboard (push to GitHub root)
2. `LangGraph_Agent_Explanation.docx` — Detailed explanation of LangGraph, ReAct, all three agents, how to add new ones, bugs and fixes
3. `dashboard_fix_guide.docx` — Earlier guide on fixing the blank Monthly chart and verifying DB data

---

## Key Technical Decisions Made

| Decision | Reason |
|---|---|
| LangGraph over old AgentExecutor | AgentExecutor deprecated in LangChain 1.3+ |
| StructuredTool over @tool decorator | @tool schema rejected by Groq with 'missing properties' error |
| 8B for SQL, 70B for orchestrator | 8B fast enough for SQL generation, saves daily 70B token budget |
| Frontend owns conversation history | Stateless backend, no memory leaks between users |
| recursion_limit: 20 | Original limit of 8 caused "need more steps" errors |
| Remove branch != 'ALL' filter | Was excluding NULL branch rows (research/school revenue) |
| Don't filter segment != '' on totals | Blank segment rows contain valid Depreciation/Interest data |

---

## How to Continue in a New Chat

1. Paste this entire document
2. Say what you want to work on
3. Paste the specific file you want to change (Claude cannot fetch GitHub files directly)

**Most useful files to have ready:**
- `backend/ai_chat.py` — for AI agent changes
- `backend/agents/sql_tool.py` — for SQL agent prompt changes
- `src/components/Overview.tsx` — for main dashboard changes
- `backend/app.py` — for new endpoints
