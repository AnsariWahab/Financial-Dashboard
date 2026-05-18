# Financial Dashboard - AI-Powered Analytics

A comprehensive financial dashboard web application built with React, TypeScript, Tailwind CSS, and Recharts. Features multi-page navigation, interactive charts, an AI assistant for data analysis, and PDF report generation.

## 🌟 Features

### 📊 Multiple Dashboard Pages
- **Overview**: Key metrics, revenue/expense trends, and monthly profit analysis
- **Centre Economics**: Performance comparison across business centres with detailed metrics
- **Transactions**: Filterable transaction history with income/expense tracking
- **Reports**: Comprehensive analytics with PDF export functionality

### 🤖 AI Financial Assistant
- Natural language query processing
- Intelligent analysis of financial data
- Answers questions like:
  - "Which month had the lowest expenses?"
  - "What's the total revenue for the year?"
  - "Compare centre performance"
  - "Generate an executive summary"

### 📄 PDF Report Generation
- Executive summary reports
- Detailed financial breakdowns
- Monthly performance trends
- Strategic recommendations

### 📱 Responsive Design
- Mobile-first approach
- Collapsible sidebar navigation
- Touch-friendly interface
- Optimized for all screen sizes

## 🚀 Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

## 🔌 Connecting to Your Python Backend

Currently, the app uses mock data from `src/data/mockData.ts`. To connect to your Python backend:

### 1. Create an API Service

Create `src/services/api.ts`:

```typescript
const API_BASE_URL = process.env.VITE_API_URL || 'http://localhost:8000/api';

export const api = {
  // Fetch monthly financial data
  getMonthlyData: async () => {
    const response = await fetch(`${API_BASE_URL}/monthly-data`);
    return response.json();
  },

  // Fetch centre performance data
  getCentreData: async () => {
    const response = await fetch(`${API_BASE_URL}/centre-data`);
    return response.json();
  },

  // Fetch recent transactions
  getTransactions: async () => {
    const response = await fetch(`${API_BASE_URL}/transactions`);
    return response.json();
  },

  // Fetch expense categories
  getExpenseCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/expense-categories`);
    return response.json();
  },

  // Fetch revenue categories
  getRevenueCategories: async () => {
    const response = await fetch(`${API_BASE_URL}/revenue-categories`);
    return response.json();
  },

  // Fetch key metrics
  getKeyMetrics: async () => {
    const response = await fetch(`${API_BASE_URL}/key-metrics`);
    return response.json();
  },
};
```

### 2. Python Backend Example (FastAPI)

```python
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from datetime import datetime
import psycopg2  # or your database driver

app = FastAPI()

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Your React dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/monthly-data")
async def get_monthly_data():
    # Query your database
    conn = psycopg2.connect("your_connection_string")
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT 
            TO_CHAR(date, 'Mon YYYY') as month,
            SUM(CASE WHEN type = 'revenue' THEN amount ELSE 0 END) as revenue,
            SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END) as expenses,
            SUM(amount) as profit
        FROM transactions
        WHERE date >= NOW() - INTERVAL '12 months'
        GROUP BY TO_CHAR(date, 'Mon YYYY')
        ORDER BY MIN(date)
    """)
    
    rows = cursor.fetchall()
    return [
        {
            "month": row[0],
            "revenue": row[1],
            "expenses": row[2],
            "profit": row[3]
        }
        for row in rows
    ]

@app.get("/api/centre-data")
async def get_centre_data():
    # Similar database query for centre performance
    pass

@app.get("/api/transactions")
async def get_transactions():
    # Query recent transactions from database
    pass

# Add more endpoints as needed
```

### 3. Update React Components

Replace mock data imports with API calls:

```typescript
import { useState, useEffect } from 'react';
import { api } from '../services/api';

export const Overview = () => {
  const [monthlyData, setMonthlyData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await api.getMonthlyData();
        setMonthlyData(data);
      } catch (error) {
        console.error('Error fetching data:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);

  // Rest of component...
};
```

### 4. Environment Variables

Create `.env` file:
```
VITE_API_URL=http://localhost:8000/api
```

For production:
```
VITE_API_URL=https://your-api-domain.com/api
```

## 🗄️ Database Schema Example

```sql
CREATE TABLE transactions (
    id SERIAL PRIMARY KEY,
    date DATE NOT NULL,
    description VARCHAR(255),
    category VARCHAR(100),
    amount DECIMAL(12, 2),
    type VARCHAR(20),  -- 'income' or 'expense'
    centre VARCHAR(100)
);

CREATE TABLE centres (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100),
    revenue DECIMAL(12, 2),
    expenses DECIMAL(12, 2),
    profit DECIMAL(12, 2),
    profit_margin DECIMAL(5, 2)
);
```

## 🤖 Enhancing the AI Assistant

### Option 1: Keep Rule-Based System
The current AI assistant uses pattern matching. It's fast, works offline, and requires no API keys.

### Option 2: Integrate OpenAI API

```typescript
// src/services/aiAgent.ts
export class FinancialAIAgent {
  async analyzeQuery(query: string): Promise<string> {
    const context = this.buildContext();
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${import.meta.env.VITE_OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are a financial analyst assistant. Here's the current financial data: ${JSON.stringify(context)}`
          },
          {
            role: 'user',
            content: query
          }
        ]
      })
    });
    
    const data = await response.json();
    return data.choices[0].message.content;
  }
  
  private buildContext() {
    // Return all financial data as context
  }
}
```

## 📦 Tech Stack

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Tailwind CSS** - Styling
- **Recharts** - Data visualization
- **jsPDF** - PDF generation
- **Lucide React** - Icons
- **Vite** - Build tool

## 🎨 Customization

### Colors
Edit the gradient and colors in components to match your brand:
```tsx
// Current: Blue theme
className="bg-gradient-to-r from-blue-600 to-blue-700"

// Change to: Green theme
className="bg-gradient-to-r from-green-600 to-green-700"
```

### Adding New Pages
1. Create component in `src/components/YourPage.tsx`
2. Add to menu items in `App.tsx`
3. Add route case in main content area

### Modifying Charts
All charts use Recharts. Customize in respective components:
- Line charts, bar charts, pie charts available
- Fully customizable colors, tooltips, legends
- Responsive by default

## 📝 Notes

- Mock data simulates a full year (Jan-Dec 2024)
- All financial calculations use realistic percentages
- PDF generation works client-side (no server required)
- AI assistant is fully client-side (can be upgraded to use API)

## 🔒 Security Considerations

When connecting to production:
- Use HTTPS for API endpoints
- Implement proper authentication (JWT, OAuth)
- Validate and sanitize all user inputs
- Use environment variables for sensitive data
- Implement rate limiting on AI queries
- Add proper error handling and logging

## 📈 Performance

- Build size: ~430 KB gzipped
- Lazy loading recommended for production
- Consider implementing React.lazy() for route-based code splitting
- Use React Query or SWR for data fetching and caching

## 🤝 Contributing

To extend this dashboard:
1. Add new data types to `mockData.ts`
2. Create visualization components
3. Extend AI agent with new query patterns
4. Add more report types to PDF generator

## 📄 License

MIT License - feel free to use this in your projects!

---

**Built with ❤️ using React, TypeScript, and Tailwind CSS**
