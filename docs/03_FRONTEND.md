# Frontend Code Explained
### React/TypeScript files in `src/`

---

## File Map

```
src/
├── main.tsx                    ← Entry point — mounts React app into index.html
├── App.tsx                     ← Root component — layout, sidebar, routing
├── index.css                   ← Global Tailwind CSS imports
│
├── components/
│   ├── Overview.tsx            ← Overview page — KPI cards, charts
│   ├── CentreEconomics.tsx     ← Centre segment P&L page
│   ├── ResearchEconomics.tsx   ← Research segment P&L page
│   ├── SchoolEconomics.tsx     ← School segment P&L page
│   ├── ImpactMetrics.tsx       ← Students, schools, STEM labs page
│   ├── AIChat.tsx              ← AI assistant chat panel
│   ├── Reports.tsx             ← Year-over-year comparison table
│   └── Transactions.tsx        ← Raw data table view
│
├── services/
│   ├── api.ts                  ← All HTTP calls to the Python backend
│   └── aiAgent.ts              ← Fallback rule-based AI (uses mock data)
│
├── data/
│   └── mockData.ts             ← Hardcoded sample data (fallback when backend is down)
│
└── utils/
    ├── cn.ts                   ← Tailwind class merging utility
    └── pdfGenerator.ts         ← PDF export logic using jsPDF
```

---

## `main.tsx` — Entry Point

```tsx
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
```

The starting point of the entire React app. `index.html` has a `<div id="root">` — this line finds it and mounts the React tree inside it. `StrictMode` enables extra warnings in development (double-renders components to catch side effects).

---

## `App.tsx` — Root Layout & Routing

### What it does
Manages the overall page layout: header, sidebar navigation, main content area, and AI chat panel. Also handles which page is currently visible.

### State
```tsx
const [currentPage, setCurrentPage] = useState<Page>('overview');
const [showChat, setShowChat] = useState(false);
const [sidebarOpen, setSidebarOpen] = useState(true);
```

- `currentPage` — which dashboard section is showing (not React Router — just conditional rendering)
- `showChat` — whether the AI chat sidebar is open
- `sidebarOpen` — for mobile: whether the left nav is visible

### Routing (no React Router)
The app uses simple conditional rendering instead of a URL router:
```tsx
{currentPage === 'overview' && <Overview />}
{currentPage === 'centres' && <CentreEconomics />}
{currentPage === 'research' && <ResearchEconomics />}
```
Simple and works fine for a single-page dashboard. No URL changes — clicking nav items just swaps which component is rendered.

### Layout Structure
```
┌─────────────────────────────────────────────────┐
│  HEADER (sticky, blue gradient)                 │
│  [☰] Financial Dashboard          [AI Assistant]│
├────────────┬────────────────────────┬───────────┤
│  SIDEBAR   │   MAIN CONTENT         │ AI CHAT   │
│  (w-64)    │   (flex-1)             │ (w-96)    │
│  Overview  │   <CurrentPage />      │ (slides   │
│  Centre    │                        │  in/out)  │
│  Research  │                        │           │
│  School    │                        │           │
│  Impact    │                        │           │
└────────────┴────────────────────────┴───────────┘
```

The sidebar is `fixed` on mobile (slides in/out with overlay) and `sticky` on desktop (always visible, scrolls with content).

---

## `services/api.ts` — Backend API Service

### Purpose
Central place for all communication with the Python backend. Every component imports from here — nothing else uses `fetch()` directly.

### Base URL
```tsx
const API_BASE_URL = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000';
```
Reads from the `.env` file at build time. Falls back to localhost if not set. The `(import.meta as any)` cast is needed because the project uses a slightly older TypeScript config.

### Interface Definitions
```tsx
export interface PnLMeasures {
  Revenue: number;
  'Direct Expense': number;
  'Gross Profit': number;
  'Gross Profit %': number;
  EBITDA: number;
  // ...etc
}
```
TypeScript interfaces define exactly what shape of data each API call returns. These must match what the Python backend actually sends — if they drift out of sync, TypeScript will catch it at compile time.

### `ApiService` Class
All API methods follow the same pattern:
```tsx
async getPnLMeasures(filters?: ApiFilters): Promise<PnLMeasures> {
  try {
    const queryString = this.buildQueryString(filters);
    const response = await fetch(`${this.baseUrl}/api/pnl-measures${queryString}`);
    if (!response.ok) throw new Error('Failed to fetch P&L measures');
    return await response.json();
  } catch (error) {
    console.error('Error fetching P&L measures:', error);
    throw error;  // let the component handle it
  }
}
```

### `buildQueryString(filters)`
Converts a filters object into URL query parameters:
```tsx
{ source_year: 'FY25-26', unit: 'Lakhs' }
→ "?source_year=FY25-26&unit=Lakhs"
```
Skips any filter set to `'All'` or undefined — only sends active filters.

### Singleton Export
```tsx
export const api = new ApiService(API_BASE_URL);
```
One instance shared across all components. Import and use:
```tsx
import { api } from '../services/api';
const data = await api.getPnLMeasures({ unit: 'Lakhs' });
```

---

## `components/Overview.tsx` — Dashboard Home Page

### State
```tsx
const [pnlData, setPnlData] = useState<PnLMeasures | null>(null);
const [segmentData, setSegmentData] = useState<SegmentData[]>([]);
const [monthlyData, setMonthlyData] = useState<MonthlyTrend[]>([]);
const [impactData, setImpactData] = useState<ImpactMetrics | null>(null);
const [loading, setLoading] = useState(true);
const [unit, setUnit] = useState('Lakhs');
```

### Data Fetching Pattern
```tsx
useEffect(() => {
  fetchData();
}, [unit]);  // re-fetches whenever unit changes

const fetchData = async () => {
  setLoading(true);
  try {
    const [pnl, segments, monthly, impact] = await Promise.all([
      api.getPnLMeasures({ unit }),
      api.getSegmentData({ unit }),
      api.getMonthlyTrend({ unit }),
      api.getImpactMetrics()
    ]);
    // set all states at once
  } finally {
    setLoading(false);
  }
};
```

`Promise.all()` fires all 4 API calls **in parallel** rather than one after another. Total wait time = slowest single call, not the sum of all calls. This is why the loading time improved significantly.

### Loading State
```tsx
if (loading || !pnlData) {
  return <div>Loading data...</div>;
}
```
Shows a loading message until all data arrives. If the backend returns an error, this stays visible — which is the "stuck on loading" problem you saw earlier.

### What's Displayed
- **KPI Cards** — Revenue, Gross Profit %, EBITDA %, PAT %, Students
- **Monthly Trend Chart** — Line chart of Revenue/Expenses/Profit by month (Recharts `LineChart`)
- **Segment Bar Chart** — Revenue by segment (Recharts `BarChart`)
- **Unit switcher** — Lakhs / Crores toggle at top right

---

## `components/CentreEconomics.tsx` (and Research, School)

These three pages follow identical patterns — only the `segment` filter value differs.

### Filter State
```tsx
const [filters, setFilters] = useState({
  source_year: 'All',
  month: 'All',
  branch: 'All',
  unit: 'Lakhs'
});
```

### Segment-Filtered Fetch
```tsx
api.getPnLMeasures({ ...filters, segment: 'centre' })
```
The segment is hardcoded per page — Centre page always passes `segment: 'centre'`, School page passes `segment: 'school'`, etc.

### P&L Table
Shows the full waterfall: Revenue → Direct Expense → Gross Profit → Indirect Expense → EBITDA → Depreciation → EBIT → Interest → PBT → Tax → PAT. Each row is a P&L line, each column is a year (from `api.getPnLTable()`).

---

## `components/AIChat.tsx` — Chat UI

### State
```tsx
const [messages, setMessages] = useState<ChatMessage[]>([
  { role: 'assistant', content: '👋 Hello! I am your The financial AI assistant...' }
]);
const [input, setInput] = useState('');
const [isLoading, setIsLoading] = useState(false);
```

### Send Message Flow
```tsx
const handleSubmit = async (e) => {
  // 1. Add user message to UI immediately
  setMessages(prev => [...prev, { role: 'user', content: input }]);
  setInput('');
  setIsLoading(true);

  // 2. Call backend
  const response = await fetch(`${API_URL}/api/ai/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: userQuestion })
  });

  // 3. Add AI response to UI
  const data = await response.json();
  setMessages(prev => [...prev, { role: 'assistant', content: data.message }]);
};
```

### Auto-scroll
```tsx
const messagesEndRef = useRef<HTMLDivElement>(null);
useEffect(() => {
  messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
}, [messages]);
```
Every time `messages` changes, scrolls to the bottom div. This keeps the latest message in view.

### Loading Indicator
Three bouncing dots while waiting for the AI response:
```tsx
{isLoading && (
  <div className="flex gap-1">
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
  </div>
)}
```

---

## `services/aiAgent.ts` — Fallback Rule-Based AI

### Purpose
A completely offline, rule-based question answering system that uses `mockData.ts`. It was the original AI before the RAG backend was built.

### How it works
Pattern matching on the user's question:
```tsx
if (this.matchesPattern(lowerQuery, ['highest', 'maximum'], ['revenue', 'income'])) {
  return this.findHighestRevenueMonth();
}
```

`matchesPattern(query, verbPatterns, nounPatterns)` checks if the query contains at least one verb AND one noun from the provided lists.

### Current Status
This file exists but is **not used by the current AIChat component** — the chat now calls the Python backend directly. It's kept as a fallback if the backend is down, and could be wired back in as a fallback in `AIChat.tsx`.

---

## `utils/cn.ts` — Class Name Utility

```tsx
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

A tiny utility used throughout components for conditional Tailwind classes:
```tsx
// Without cn():
className={`px-4 py-2 ${isActive ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'}`}

// With cn():
className={cn('px-4 py-2', isActive && 'bg-blue-600 text-white', !isActive && 'bg-gray-100 text-gray-700')}
```

`twMerge` resolves conflicting Tailwind classes (e.g. `bg-blue-600` overrides `bg-gray-100` instead of both being applied).

---

## `utils/pdfGenerator.ts` — PDF Export

Uses `jsPDF` to generate downloadable PDF reports from the dashboard data. Called from the Reports page when the user clicks "Export PDF". Draws text and tables directly onto a PDF canvas.

---

## `data/mockData.ts` — Fallback Data

Hardcoded sample financial data used by:
- `aiAgent.ts` (the rule-based AI fallback)
- Any component that catches an API error and renders sample data

In normal operation with the backend running, this data is never shown. It exists so the app doesn't break completely if the backend is unreachable.

---

## Recharts — How Charts Work

Both `LineChart` and `BarChart` follow this pattern:
```tsx
<ResponsiveContainer width="100%" height={300}>
  <LineChart data={monthlyData}>
    <CartesianGrid strokeDasharray="3 3" />
    <XAxis dataKey="month" />
    <YAxis />
    <Tooltip />
    <Legend />
    <Line type="monotone" dataKey="revenue" stroke="#3B82F6" />
    <Line type="monotone" dataKey="profit" stroke="#10B981" />
  </LineChart>
</ResponsiveContainer>
```

- `ResponsiveContainer` — makes the chart fill its parent width
- `dataKey` — which field from the data array to plot (must match API response field names)
- `stroke` — line color in hex

The data arrays come directly from the API service — no transformation needed since the backend already returns them in the right shape.
