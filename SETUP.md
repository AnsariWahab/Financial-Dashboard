# Setup Guide — Financial Dashboard

## Prerequisites

- Python 3.10+
- Node.js 18+
- MySQL 8.0+
- A free Groq API key → https://console.groq.com

---

## Windows Users — Do This First

Windows has a 260-character path limit by default. Python venvs inside deeply nested
OneDrive/Documents folders will hit this and fail (especially with PyTorch-based packages).

**Fix option A — Move the project to a short path (Recommended):**
```
C:\dev\dashboard\        ← good, short path
C:\Users\Name\OneDrive\Documents\Personal\Arena AI\Final\...  ← too long, will break
```

**Fix option B — Enable long paths in Windows (one-time):**
1. Press `Win + R` → type `regedit` → Enter
2. Navigate to: `HKEY_LOCAL_MACHINE\SYSTEM\CurrentControlSet\Control\FileSystem`
3. Double-click `LongPathsEnabled` → set value to `1`
4. Restart your PC

Or run this in PowerShell as Administrator:
```powershell
New-ItemProperty -Path "HKLM:\SYSTEM\CurrentControlSet\Control\FileSystem" `
  -Name "LongPathsEnabled" -Value 1 -PropertyType DWORD -Force
```

---

## 1. Clone / Unzip the Project

**Move to a short path first (Windows):**
```
C:\dev\dashboard\
```

Then unzip there.

---

## 2. Set Up the Database

Open MySQL and run:
```sql
CREATE DATABASE omotec_dashboard;
USE omotec_dashboard;
```

Then run the schema and seed scripts:
```bash
cd backend
python create_tables.py
python insert_sample_data.py
```

---

## 3. Configure Environment Variables

```bash
cd backend
# Edit .env with your actual values
```

`backend/.env`:
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=omotec_dashboard
DB_PORT=3306

# Get free key at https://console.groq.com
GROQ_API_KEY=gsk_your_key_here

# Lightweight ONNX embedder — no PyTorch needed
EMBEDDING_BACKEND=onnx

ANONYMIZED_TELEMETRY=False
```

---

## 4. Set Up the Python Backend

```bash
cd backend

# Create venv (use a short path if on Windows — see note above)
python -m venv venv

# Activate
# Windows:   venv\Scripts\activate
# Mac/Linux: source venv/bin/activate

# Install dependencies (~250MB with onnx, no PyTorch)
pip install -r requirements.txt
```

**Install sizes:**
- `EMBEDDING_BACKEND=onnx` → ~250MB ✅ (default, no PyTorch)
- `EMBEDDING_BACKEND=sentence_transformers` → ~900MB ⚠️ (needs PyTorch, causes Windows path errors in deep folders)

---

## 5. Start the Backend

```bash
uvicorn app:app --reload --port 8000
```

Expected output:
```
📦 Using ONNX default embedder (lightweight, ~50MB)
✅ Created new RAG collection
✅ Indexed N documents into RAG system
INFO: Uvicorn running on http://127.0.0.1:8000
```

Test: http://localhost:8000

---

## 6. Set Up the Frontend

Open a new terminal from the project root:
```bash
npm install
npm run dev
```

Frontend: http://localhost:5173

---

## Common Issues

### "OSError: No such file or directory" on pip install
→ Your project folder path is too long (Windows 260-char limit).
→ Move project to `C:\dev\dashboard\` and reinstall.

### "GROQ_API_KEY not set"
→ Edit `backend/.env` and paste your key from https://console.groq.com

### Database connection refused
→ Check MySQL is running. Try `DB_HOST=127.0.0.1` instead of `localhost`.

### ChromaDB re-indexes every restart
→ The `chroma_db/` folder may lack write permissions.
→ Run: `icacls backend\chroma_db /grant Everyone:F` (Windows)

### Frontend can't reach backend
→ Ensure backend is on port 8000. Check `src/services/api.ts` for the base URL.

---

## Reindex After Adding New Data

```bash
curl -X POST http://localhost:8000/api/reindex
# or just restart the backend
```

---

## Project Structure

```
├── backend/
│   ├── app.py                 # FastAPI routes
│   ├── ai_chat.py             # Groq AI + RAG orchestration
│   ├── rag_system.py          # ChromaDB indexing & retrieval
│   ├── database.py            # MySQL queries
│   ├── measures.py            # P&L financial calculations
│   ├── create_tables.py       # DB schema
│   ├── insert_sample_data.py  # Sample data seeder
│   ├── requirements.txt       # Python deps (no PyTorch)
│   ├── .env                   # Your secrets (gitignored)
│   └── .env.example           # Template
├── src/
│   ├── components/            # React dashboard pages
│   ├── services/api.ts        # Backend API calls
│   └── services/aiAgent.ts    # Fallback rule-based agent
├── .gitignore
├── package.json
├── SETUP.md       ← you are here
├── RAG_EXPLAINED.md
└── CHANGES.md
```
