# Config & Infrastructure Explained
### Root config files, environment, caching, project structure

---

## Project Structure (Full)

```
dashboard/                          ← project root
│
├── backend/                        ← Python FastAPI server
│   ├── app.py                      ← API routes + caching
│   ├── database.py                 ← MySQL connection + data fetching
│   ├── measures.py                 ← P&L financial calculations
│   ├── ai_chat.py                  ← Groq AI orchestration
│   ├── rag_system.py               ← ChromaDB vector search
│   ├── create_tables.py            ← One-time DB schema setup
│   ├── insert_sample_data.py       ← Sample data seeder
│   ├── check_schema.py             ← DB inspection utility
│   ├── requirements.txt            ← Python dependencies
│   ├── .env                        ← Secrets (gitignored)
│   ├── .env.example                ← Template for new developers
│   └── chroma_db/                  ← ChromaDB vector store (gitignored, auto-created)
│
├── src/                            ← React TypeScript frontend
│   ├── main.tsx                    ← App entry point
│   ├── App.tsx                     ← Root layout + routing
│   ├── index.css                   ← Global Tailwind CSS
│   ├── components/                 ← Page components
│   │   ├── Overview.tsx
│   │   ├── CentreEconomics.tsx
│   │   ├── ResearchEconomics.tsx
│   │   ├── SchoolEconomics.tsx
│   │   ├── ImpactMetrics.tsx
│   │   ├── AIChat.tsx
│   │   ├── Reports.tsx
│   │   └── Transactions.tsx
│   ├── services/
│   │   ├── api.ts                  ← All backend API calls
│   │   └── aiAgent.ts              ← Fallback rule-based AI
│   ├── data/
│   │   └── mockData.ts             ← Hardcoded fallback data
│   └── utils/
│       ├── cn.ts                   ← Tailwind class utility
│       └── pdfGenerator.ts         ← PDF export
│
├── docs/                           ← This documentation folder
│   ├── 00_INDEX.md
│   ├── 01_BACKEND.md
│   ├── 02_RAG_AND_AI.md
│   ├── 03_FRONTEND.md
│   └── 04_CONFIG_AND_INFRA.md
│
├── index.html                      ← Vite entry HTML (required)
├── vite.config.ts                  ← Vite bundler config
├── package.json                    ← Node dependencies + scripts
├── tsconfig.json                   ← TypeScript compiler config
├── tsconfig.app.json               ← TypeScript config for src/
├── .env                            ← Frontend env vars (VITE_API_URL)
├── .gitignore                      ← Excludes venv, node_modules, etc.
├── README.md
├── SETUP.md
├── CHANGES.md
└── RAG_EXPLAINED.md
```

---

## `index.html` — Vite Entry Point

```html
<!doctype html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Financial Dashboard</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

Vite **requires** this file in the project root. It is the shell HTML page that Vite serves. The `<div id="root">` is where React mounts. The `<script type="module">` tells the browser to load `main.tsx` as an ES module — Vite intercepts this and handles TypeScript transpilation.

**This file was accidentally deleted during cleanup and caused the blank page / 404 error.** It must exist at the root.

---

## `vite.config.ts` — Build Tool Config

```typescript
const isBuild = process.argv.includes("build");

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    ...(isBuild ? [viteSingleFile()] : [])  // only on npm run build
  ],
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") }
  }
});
```

### Plugins
- **`@vitejs/plugin-react`** — enables JSX/TSX compilation and React Fast Refresh (hot reload)
- **`@tailwindcss/vite`** — integrates Tailwind CSS v4 with Vite's build pipeline
- **`vite-plugin-singlefile`** — bundles all JS/CSS inline into one HTML file (build only)

### Why `viteSingleFile` is Build-Only
`viteSingleFile` inlines all assets into `index.html` for easy deployment (one file, no separate JS/CSS). But when active during `npm run dev`, it breaks Vite's module serving and causes a 404 on the root route. The `isBuild` check ensures it only activates during `npm run build`.

### Path Alias
```typescript
alias: { "@": path.resolve(__dirname, "src") }
```
Lets you import from `@/components/Overview` instead of `../../components/Overview`. Much cleaner for deeply nested files.

---

## `package.json` — Node Dependencies

### Scripts
```json
"scripts": {
  "dev":     "vite",           // start dev server on :5173
  "build":   "vite build",     // bundle to dist/ folder
  "preview": "vite preview"    // serve the dist/ build locally
}
```

### Key Dependencies
| Package | Purpose |
|---------|---------|
| `react` + `react-dom` | UI framework |
| `recharts` | Charts (LineChart, BarChart, etc.) |
| `lucide-react` | Icon library |
| `tailwindcss` | Utility CSS framework |
| `date-fns` | Date formatting utilities |
| `jspdf` | PDF generation for exports |
| `clsx` + `tailwind-merge` | Conditional class name utilities |
| `vite-plugin-singlefile` | Bundles everything into one HTML file |

### Why No React Router?
The dashboard uses simple conditional rendering (`currentPage === 'overview'`) instead of React Router. For a single-page internal dashboard with no URL-based navigation needs, this is simpler and avoids an extra dependency.

---

## Environment Variables

### Frontend — `.env` (project root)
```env
VITE_API_URL=http://localhost:8000
```

Vite reads `.env` files in the project root automatically. Variables **must** be prefixed with `VITE_` to be exposed to the browser. Accessed in code as:
```typescript
import.meta.env.VITE_API_URL
```

For production, change this to your actual backend URL:
```env
VITE_API_URL=https://api.yourdomain.com
```

### Backend — `backend/.env`
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=omotec_dashboard
DB_PORT=3306

GROQ_API_KEY=gsk_...

EMBEDDING_BACKEND=onnx       # or sentence_transformers
ANONYMIZED_TELEMETRY=False
```

Loaded by `python-dotenv` (`load_dotenv()`) at the top of `database.py`, `rag_system.py`, and `ai_chat.py`. Values accessed via `os.getenv('KEY', 'default')`.

**Security rules:**
- `.env` is in `.gitignore` — never committed to Git
- `.env.example` is committed — shows what variables are needed without real values
- Never hardcode passwords or API keys in Python/TypeScript files

---

## `.gitignore` — What Gets Excluded

```gitignore
# Python
__pycache__/        ← compiled bytecode, auto-regenerated
venv/ / .venv/      ← virtual environment (~900MB with sentence-transformers)
*.pyc

# ChromaDB
backend/chroma_db/  ← vector index, regenerated from MySQL on startup

# Secrets
backend/.env        ← never commit credentials

# Node
node_modules/       ← npm packages (~400MB)
dist/               ← build output

# OS
.DS_Store
```

**The size problem explained:**
Without `.gitignore`, a zip of this project includes `venv/` (~900MB) and `node_modules/` (~400MB). With `.gitignore` respected during zipping, the source code is only ~500KB. Recipients run `pip install -r requirements.txt` and `npm install` to restore these locally.

**How to zip cleanly:**
```bash
zip -r project.zip . -x "*/venv/*" -x "*/node_modules/*" -x "*/__pycache__/*" -x "*/chroma_db/*"
```

---

## `tsconfig.json` + `tsconfig.app.json` — TypeScript Config

```json
// tsconfig.app.json (key settings)
{
  "compilerOptions": {
    "target": "ES2020",           // output modern JS
    "lib": ["ES2020", "DOM"],     // browser APIs available
    "module": "ESNext",           // use ES modules
    "moduleResolution": "bundler",// Vite handles resolution
    "jsx": "react-jsx",           // JSX transform
    "strict": true,               // catch more errors
    "paths": { "@/*": ["./src/*"] } // @/ alias
  }
}
```

`strict: true` enables strict null checks, no implicit any, etc. This means TypeScript will error if you try to access a property on something that could be null — which is why you see `pnlData?.Revenue` (optional chaining) throughout the components.

---

## The Caching Layer (recap)

Defined in `app.py`:

```python
_cache: Dict[str, Any] = {}      # key → result
_cache_ts: Dict[str, float] = {} # key → timestamp
CACHE_TTL = 300                   # 5 minutes
```

### Cache key format
`"endpoint|year|month|segment|branch|unit"`

Examples:
```
"pnl|None|None|None|None|Lakhs"       ← no filters, Lakhs
"seg|FY25-26|None|Lakhs"              ← segment data filtered to FY25-26
"monthly|None|centre|None|Crores"     ← centre segment, Crores
```

### Startup pre-warm
```python
@app.on_event("startup")
async def startup_prewarm():
    df = get_financials()
    cache_set("pnl|None|None|None|None|Lakhs", get_all_pnl_measures(df, 100000))
    ...
```

Runs once when uvicorn starts. Pre-populates the most common cache keys (default view, no filters) so the very first page load is instant.

### Cache invalidation
Call `POST /api/reindex` or `POST /api/cache/clear` to wipe the cache after data updates.

---

## Port Reference

| Service | Port | URL |
|---------|------|-----|
| Vite dev server (frontend) | 5173 | http://localhost:5173 |
| FastAPI backend | 8000 | http://localhost:8000 |
| MySQL | 3306 or 3307 | (internal, not browser-accessible) |
| ChromaDB | — | local file only, no port |

---

## Common Commands Reference

```bash
# Backend
cd backend
source venv/bin/activate          # Mac/Linux
venv\Scripts\activate             # Windows
uvicorn app:app --reload --port 8000

# Frontend
cd ..                             # back to project root
npm run dev                       # starts on :5173
npm run build                     # bundles to dist/

# Force RAG reindex
curl -X POST http://localhost:8000/api/reindex

# Clear cache only
curl -X POST http://localhost:8000/api/cache/clear

# Check DB schema
cd backend && python check_schema.py

# Test DB connection
cd backend && python database.py
```
